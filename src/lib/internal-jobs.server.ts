// Server-only (sufixo .server.ts). Chamado direto de src/server.ts (fora do
// roteador do TanStack, ver comentário lá) -- nunca importado por uma rota
// React, então nunca entra no bundle do cliente nem no pipeline de
// serialização SSR (Seroval não sabe serializar um Response cru; jogar isso
// num beforeLoad/loader quebra intermitentemente conforme a versão do
// @lovable.dev/vite-tanstack-config).
import { z } from "zod";
import { PROCESSING_STAGES } from "@/lib/api/types";
import { verifyInternalRequest, jsonResponse } from "@/lib/internal-auth.server";

// Status que representam uma decisão já tomada por uma pessoa (ou pela
// administração) -- o fim automático do pipeline nunca deve sobrescrever
// nenhum destes.
const LOCKED_PROPONENT_STATUSES = [
  "aprovado_pela_avaliadora",
  "bloqueado",
  "pendencia_administrativa",
];

const createJobBodySchema = z.object({
  editalId: z.string().uuid(),
  applicationId: z.string().uuid(),
  triggeredBy: z.string().uuid().nullable().optional(),
});

export async function handleCreateJobRequest(request: Request): Promise<Response> {
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
}

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

export async function handleUpdateStageRequest(
  request: Request,
  params: { jobId: string; stage: string },
): Promise<Response> {
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

  // Pipeline terminou as 12 etapas: sinaliza pra avaliadora que o dossiê
  // saiu de "Importado" e está pronto pra revisão, sem mexer em status que
  // já refletem uma decisão humana/administrativa (aprovado, bloqueado,
  // pendência administrativa) -- best-effort, nunca derruba a resposta já
  // bem-sucedida do job/etapa se isso falhar.
  if (status === "concluido") {
    try {
      const { data: job } = await supabaseAdmin
        .from("processing_jobs")
        .select("proponent_id")
        .eq("id", jobId)
        .maybeSingle();
      if (job?.proponent_id) {
        const { data: proponent } = await supabaseAdmin
          .from("proponents")
          .select("status")
          .eq("id", job.proponent_id)
          .maybeSingle();
        if (proponent && !LOCKED_PROPONENT_STATUSES.includes(proponent.status)) {
          await supabaseAdmin
            .from("proponents")
            .update({ status: "auditoria_concluida" })
            .eq("id", job.proponent_id);
        }
      }
    } catch (err) {
      console.warn("advance_proponent_status_failed", err);
    }
  }

  return jsonResponse({ ok: true, jobStatus: status }, 200);
}

// Cancelamento é best-effort: marca o job e as etapas ainda não terminais
// como "cancelado" no banco, mas não tem como abortar um processo já
// rodando no Worker no meio de uma chamada (Poppler/OpenAI/etc) -- se essa
// etapa terminar depois disso, ela ainda vai reportar seu próprio resultado
// via updateStage. Suficiente pra destravar um job "fantasma" (ver
// enqueueFirstStage no Railway): normalmente cancelado porque nunca chegou
// a rodar de verdade, não porque estava em andamento.
export async function handleCancelJob(
  request: Request,
  params: { jobId: string },
): Promise<Response> {
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

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: stagesError } = await supabaseAdmin
    .from("job_stages")
    .update({ state: "cancelado", finished_at: new Date().toISOString() })
    .eq("job_id", params.jobId)
    .in("state", ["aguardando", "na_fila", "processando"]);
  if (stagesError) {
    return jsonResponse({ code: "stages_cancel_failed", message: stagesError.message }, 500);
  }

  const { error: jobError } = await supabaseAdmin
    .from("processing_jobs")
    .update({ status: "cancelado", finished_at: new Date().toISOString() })
    .eq("id", params.jobId);
  if (jobError) {
    return jsonResponse({ code: "job_cancel_failed", message: jobError.message }, 500);
  }

  return jsonResponse({ ok: true }, 200);
}

// Reseta uma etapa específica pra "na_fila" (limpa erro/tentativas) --
// chamado antes do Railway reenfileirar essa etapa no BullMQ. Usado tanto
// por "Repetir etapa" (etapa explícita) quanto por "Repetir" no nível do
// job (Railway resolve qual é a primeira etapa não concluída e chama isso
// pra ela).
const resetStageParamsSchema = z.object({ stage: z.enum(PROCESSING_STAGES) });

export async function handleResetStage(
  request: Request,
  params: { jobId: string; stage: string },
): Promise<Response> {
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
  const parsedParams = resetStageParamsSchema.safeParse({ stage: params.stage });
  if (!parsedParams.success) {
    return jsonResponse({ code: "invalid_params", message: parsedParams.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: stageError } = await supabaseAdmin
    .from("job_stages")
    .update({
      state: "na_fila",
      attempts: 0,
      error_code: null,
      error_message: null,
      started_at: null,
      finished_at: null,
    })
    .eq("job_id", params.jobId)
    .eq("stage", params.stage);
  if (stageError) {
    return jsonResponse({ code: "stage_reset_failed", message: stageError.message }, 500);
  }

  const { error: jobError } = await supabaseAdmin
    .from("processing_jobs")
    .update({ status: "na_fila", finished_at: null, error_code: null, error_message: null })
    .eq("id", params.jobId);
  if (jobError) {
    return jsonResponse({ code: "job_reset_failed", message: jobError.message }, 500);
  }

  return jsonResponse({ ok: true }, 200);
}
