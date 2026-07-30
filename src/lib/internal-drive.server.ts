// Server-only (sufixo .server.ts) — mesma convenção de internal-jobs.server.ts:
// escritas privilegiadas nas tabelas de Drive (drive_connections/
// drive_sources/sync_runs), chamadas só pelo Railway via HMAC.
import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { verifyInternalRequest, jsonResponse } from "@/lib/internal-auth.server";

const createConnectionBodySchema = z.object({
  connectedBy: z.string().uuid(),
  googleEmail: z.string().nullable().optional(),
  refreshTokenEncryptedHex: z.string().min(1),
  scope: z.string().min(1),
});

export const handleCreateDriveConnection = createServerOnlyFn(async (): Promise<Response> => {
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
});

const createSourceBodySchema = z.object({
  connectionId: z.string().uuid(),
  editalId: z.string().uuid(),
  driveFolderId: z.string().min(1),
  folderName: z.string().nullable().optional(),
});

export const handleCreateDriveSource = createServerOnlyFn(async (): Promise<Response> => {
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
});

const createSyncRunBodySchema = z.object({
  driveSourceId: z.string().uuid(),
  editalId: z.string().uuid(),
  kind: z.enum(["baseline", "incremental"]),
  triggeredBy: z.string().uuid(),
});

export const handleCreateSyncRun = createServerOnlyFn(async (): Promise<Response> => {
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
      status: "processando",
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
});

const finishSyncRunBodySchema = z.object({
  status: z.enum(["concluido", "erro"]),
  stats: z.record(z.number()).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

export const handleFinishSyncRun = createServerOnlyFn(
  async (params: { syncRunId: string }): Promise<Response> => {
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
  },
);
