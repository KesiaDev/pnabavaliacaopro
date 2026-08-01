// Server-only (sufixo .server.ts). Chamado direto de src/server.ts, fora do
// roteador do TanStack -- ver internal-jobs.server.ts pro motivo (Seroval
// não sabe serializar um Response cru).
import { z } from "zod";
import { verifyInternalRequest, jsonResponse } from "@/lib/internal-auth.server";

const createConnectionBodySchema = z.object({
  connectedBy: z.string().uuid(),
  googleEmail: z.string().nullable().optional(),
  refreshTokenEncryptedHex: z.string().min(1),
  scope: z.string().min(1),
});

export async function handleCreateDriveConnection(request: Request): Promise<Response> {
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
  const parsed = createConnectionBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { connectedBy, googleEmail, refreshTokenEncryptedHex, scope } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("drive_connections")
    .insert({
      connected_by: connectedBy,
      google_email: googleEmail ?? null,
      refresh_token_encrypted: refreshTokenEncryptedHex,
      scope,
    })
    .select("id")
    .single();
  if (error || !data) {
    return jsonResponse(
      { code: "connection_create_failed", message: error?.message ?? "Falha ao criar conexão." },
      500,
    );
  }
  return jsonResponse({ id: data.id as string }, 201);
}

const createSourceBodySchema = z.object({
  connectionId: z.string().uuid(),
  editalId: z.string().uuid(),
  driveFolderId: z.string().min(1),
  folderName: z.string().nullable().optional(),
});

export async function handleCreateDriveSource(request: Request): Promise<Response> {
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
  const parsed = createSourceBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { connectionId, editalId, driveFolderId, folderName } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("drive_sources")
    .insert({
      connection_id: connectionId,
      edital_id: editalId,
      drive_folder_id: driveFolderId,
      folder_name: folderName ?? null,
    })
    .select("id, folder_name")
    .single();
  if (error || !data) {
    return jsonResponse(
      { code: "source_create_failed", message: error?.message ?? "Falha ao criar fonte." },
      500,
    );
  }
  return jsonResponse(
    { id: data.id as string, folderName: (data.folder_name as string | null) ?? null },
    201,
  );
}

// Valores batem com o check constraint real de supabase/migrations
// (.../phase2_drive_import.sql): kind in ('baseline','sync'), status in
// ('em_andamento','concluido','erro') -- nunca "incremental"/"processando".
const createSyncRunBodySchema = z.object({
  driveSourceId: z.string().uuid(),
  editalId: z.string().uuid(),
  kind: z.enum(["baseline", "sync"]),
  triggeredBy: z.string().uuid(),
});

export async function handleCreateSyncRun(request: Request): Promise<Response> {
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
  const parsed = createSyncRunBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { driveSourceId, editalId, kind, triggeredBy } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("sync_runs")
    .insert({
      drive_source_id: driveSourceId,
      edital_id: editalId,
      kind,
      status: "em_andamento",
      triggered_by: triggeredBy,
    })
    .select("id")
    .single();
  if (error || !data) {
    return jsonResponse(
      { code: "sync_run_create_failed", message: error?.message ?? "Falha ao criar sync_run." },
      500,
    );
  }
  return jsonResponse({ id: data.id as string }, 201);
}

const executeSyncRunBodySchema = z.object({
  accessToken: z.string().min(1),
});

// Dispara a varredura recursiva real (listar Drive, baixar, hash, gravar
// proponents/files/file_versions/sync_changes) -- chamado pelo Worker do
// Railway depois de renovar o access_token do Google. O corpo pode levar
// minutos numa pasta grande; o próprio módulo já grava o status final em
// sync_runs (sucesso ou erro) antes de retornar/lançar.
export async function handleExecuteSyncRun(
  request: Request,
  params: { syncRunId: string },
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
  const parsed = executeSyncRunBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { executeSyncRun } = await import("@/lib/drive-sync-executor.server");
  try {
    const stats = await executeSyncRun(params.syncRunId, parsed.data.accessToken);
    return jsonResponse({ ok: true, stats }, 200);
  } catch (err) {
    return jsonResponse(
      {
        code: "sync_execution_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
}

const finishSyncRunBodySchema = z.object({
  status: z.enum(["concluido", "erro"]),
  stats: z.record(z.number()).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

export async function handleFinishSyncRun(
  request: Request,
  params: { syncRunId: string },
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
  const parsed = finishSyncRunBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("sync_runs")
    .update({
      status: parsed.data.status,
      finished_at: new Date().toISOString(),
      stats: parsed.data.stats ?? null,
      error_message: parsed.data.errorMessage ?? null,
    })
    .eq("id", params.syncRunId);
  if (error) {
    return jsonResponse({ code: "sync_run_finish_failed", message: error.message }, 500);
  }
  return jsonResponse({ ok: true }, 200);
}
