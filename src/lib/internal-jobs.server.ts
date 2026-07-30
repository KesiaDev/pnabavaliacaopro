// Server-only (sufixo .server.ts) — mesma convenção do resto do app: só
// importar dinamicamente de dentro de beforeLoad/handler, nunca no topo de
// um arquivo de rota (senão o bundler do cliente reclama, ver
// import-protection do TanStack Start).
import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { PROCESSING_STAGES } from "@/lib/api/types";
import { verifyInternalRequest, jsonResponse } from "@/lib/internal-auth.server";

const createJobBodySchema = z.object({
  editalId: z.string().uuid(),
  applicationId: z.string().uuid(),
  triggeredBy: z.string().uuid().nullable().optional(),
});

export const handleCreateJobRequest = createServerOnlyFn(async (): Promise<Response> => {
  const request = getRequest();
  if (request.method !== "POST") {
    return jsonResponse({ code: "method_not_allowed", message: "Use POST." }, 405);
  }

  const auth = await verifyInternalRequest(request);
  if (!auth.ok) {
    return jsonResponse(
      { code: "unauthorized", message: auth.errorMessage },
      auth.errorStatus ?? 401,
    );
  }

  const parsed = createJobBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { editalId, applicationId, triggeredBy } = parsed.data;

  const { data: job, error: jobError } = await supabaseAdmin
    .from("processing_jobs")
    .insert({
      edital_id: editalId,
      proponent_id: applicationId,
      status: "na_fila",
      triggered_by: triggeredBy ?? null,
    })
    .select("id")
    .single();
  if (jobError || !job) {
    return jsonResponse(
      { code: "job_create_failed", message: jobError?.message ?? "Falha ao criar job." },
      500,
    );
  }

  const stageRows = PROCESSING_STAGES.map((stage, index) => ({
    job_id: job.id,
    stage,
    order_index: index,
    state: "na_fila" as const,
    attempts: 0,
    retryable: true,
    preserved: true,
  }));
  const { error: stagesError } = await supabaseAdmin.from("job_stages").insert(stageRows);
  if (stagesError) {
    return jsonResponse({ code: "stages_create_failed", message: stagesError.message }, 500);
  }

  return jsonResponse({ jobId: job.id as string }, 201);
});

const stageStateSchema = z.enum([
  "aguardando",
  "na_fila",
  "processando",
  "concluido",
  "falhou",
  "revisao",
  "cancelado",
]);

const updateStageBodySchema = z.object({
  state: stageStateSchema,
  attempts: z.number().int().min(0).optional(),
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  retryable: z.boolean().optional(),
  preserved: z.boolean().optional(),
});

type StageState = z.infer<typeof stageStateSchema>;

// Agrega o estado de todas as etapas do job num status único — nunca marca o
// job como concluído com etapas ainda pendentes, nunca "esconde" uma falha
// preservada (preserved=true) como se o trabalho anterior tivesse sumido.
function computeJobStatus(stageStates: string[]): { status: StageState; terminal: boolean } {
  if (stageStates.some((s) => s === "processando"))
    return { status: "processando", terminal: false };
  if (stageStates.some((s) => s === "na_fila")) return { status: "na_fila", terminal: false };
  if (stageStates.some((s) => s === "falhou")) return { status: "falhou", terminal: true };
  if (stageStates.some((s) => s === "revisao")) return { status: "revisao", terminal: true };
  if (stageStates.every((s) => s === "concluido")) return { status: "concluido", terminal: true };
  return { status: "aguardando", terminal: false };
}

export const handleUpdateStageRequest = createServerOnlyFn(
  async (params: { jobId: string; stage: string }): Promise<Response> => {
    const request = getRequest();
    if (request.method !== "POST") {
      return jsonResponse({ code: "method_not_allowed", message: "Use POST." }, 405);
    }

    const auth = await verifyInternalRequest(request);
    if (!auth.ok) {
      return jsonResponse(
        { code: "unauthorized", message: auth.errorMessage },
        auth.errorStatus ?? 401,
      );
    }

    const parsed = updateStageBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
    if (!parsed.success) {
      return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
    }
    const patch = parsed.data;
    const { jobId, stage } = params;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existingStage, error: findError } = await supabaseAdmin
      .from("job_stages")
      .select("id")
      .eq("job_id", jobId)
      .eq("stage", stage)
      .maybeSingle();
    if (findError) {
      return jsonResponse({ code: "stage_lookup_failed", message: findError.message }, 500);
    }
    if (!existingStage) {
      return jsonResponse(
        { code: "stage_not_found", message: `Etapa "${stage}" não existe para este job.` },
        404,
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("job_stages")
      .update({
        state: patch.state,
        ...(patch.attempts !== undefined ? { attempts: patch.attempts } : {}),
        ...(patch.startedAt !== undefined ? { started_at: patch.startedAt } : {}),
        ...(patch.finishedAt !== undefined ? { finished_at: patch.finishedAt } : {}),
        ...(patch.errorCode !== undefined ? { error_code: patch.errorCode } : {}),
        ...(patch.errorMessage !== undefined ? { error_message: patch.errorMessage } : {}),
        ...(patch.retryable !== undefined ? { retryable: patch.retryable } : {}),
        ...(patch.preserved !== undefined ? { preserved: patch.preserved } : {}),
      })
      .eq("id", existingStage.id);
    if (updateError) {
      return jsonResponse({ code: "stage_update_failed", message: updateError.message }, 500);
    }

    const { data: allStages, error: allStagesError } = await supabaseAdmin
      .from("job_stages")
      .select("state")
      .eq("job_id", jobId);
    if (allStagesError || !allStages) {
      return jsonResponse(
        {
          code: "stage_aggregate_failed",
          message: allStagesError?.message ?? "Falha ao agregar etapas.",
        },
        500,
      );
    }

    const { status, terminal } = computeJobStatus(allStages.map((s) => s.state as string));
    const { error: jobUpdateError } = await supabaseAdmin
      .from("processing_jobs")
      .update({
        status,
        ...(status === "processando" ? { started_at: new Date().toISOString() } : {}),
        ...(terminal ? { finished_at: new Date().toISOString() } : {}),
        ...(patch.errorCode !== undefined ? { error_code: patch.errorCode } : {}),
        ...(patch.errorMessage !== undefined ? { error_message: patch.errorMessage } : {}),
      })
      .eq("id", jobId);
    if (jobUpdateError) {
      return jsonResponse({ code: "job_update_failed", message: jobUpdateError.message }, 500);
    }

    return jsonResponse({ ok: true, jobStatus: status }, 200);
  },
);
