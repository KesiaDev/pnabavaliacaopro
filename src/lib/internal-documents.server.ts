// Server-only (sufixo .server.ts). Chamado direto de src/server.ts, fora do
// roteador do TanStack -- ver internal-jobs.server.ts pro motivo (Seroval
// não sabe serializar um Response cru).
//
// Fase 6 (ADR-9): o Worker do Railway roda Poppler (pdfinfo/pdftotext/
// pdftoppm), que não existe no runtime do app web (Cloudflare Workers, sem
// filesystem/exec) -- por isso o app web só entrega URLs assinadas de
// leitura (o Worker baixa e processa) e recebe de volta o resultado já
// pronto pra gravar (nunca manda binário bruto por aqui).
import { z } from "zod";
import { verifyInternalRequest, jsonResponse } from "@/lib/internal-auth.server";

const DOSSIES_BUCKET = "dossies-privados";
const SIGNED_URL_TTL_SECONDS = 15 * 60;

const listFilesBodySchema = z.object({}).optional();

export async function handleListProponentFiles(
  request: Request,
  params: { proponentId: string },
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
  const parsed = listFilesBodySchema.safeParse(auth.body ? JSON.parse(auth.body) : {});
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: files, error } = await supabaseAdmin
    .from("files")
    .select("id, nome, mime_type, tipo_documental, file_versions(id, versao, storage_path)")
    .eq("proponent_id", params.proponentId);
  if (error) {
    return jsonResponse({ code: "list_failed", message: error.message }, 500);
  }

  const result: Array<{
    fileId: string;
    fileVersionId: string;
    nome: string;
    mimeType: string | null;
    tipoDocumental: string;
    downloadUrl: string;
  }> = [];

  for (const f of files ?? []) {
    const versions = (f.file_versions ?? []) as Array<{
      id: string;
      versao: number;
      storage_path: string;
    }>;
    if (versions.length === 0) continue;
    const latest = versions.reduce((a, b) => (b.versao > a.versao ? b : a));
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(DOSSIES_BUCKET)
      .createSignedUrl(latest.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed) continue;
    result.push({
      fileId: f.id as string,
      fileVersionId: latest.id,
      nome: f.nome as string,
      mimeType: f.mime_type as string | null,
      tipoDocumental: f.tipo_documental as string,
      downloadUrl: signed.signedUrl,
    });
  }

  return jsonResponse({ files: result }, 200);
}

const pageInputSchema = z.object({
  numeroPagina: z.number().int().positive(),
  texto: z.string(),
  textLength: z.number().int().nonnegative(),
  printableRatio: z.number().nullable(),
  qualidade: z.enum(["boa", "baixa", "imagem_pura"]),
  precisaVisao: z.boolean(),
});

const saveDocumentPagesBodySchema = z.object({
  fileId: z.string().uuid(),
  fileVersionId: z.string().uuid(),
  pages: z.array(pageInputSchema).min(1),
});

export async function handleSaveDocumentPages(request: Request): Promise<Response> {
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
  const parsed = saveDocumentPagesBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { fileId, fileVersionId, pages } = parsed.data;
  const rows = pages.map((p) => ({
    file_id: fileId,
    file_version_id: fileVersionId,
    numero_pagina: p.numeroPagina,
    texto: p.texto,
    text_length: p.textLength,
    printable_ratio: p.printableRatio,
    qualidade: p.qualidade,
    precisa_visao: p.precisaVisao,
  }));

  const { error } = await supabaseAdmin
    .from("document_pages")
    .upsert(rows, { onConflict: "file_version_id,numero_pagina" });
  if (error) {
    return jsonResponse({ code: "save_failed", message: error.message }, 500);
  }
  return jsonResponse({ ok: true, saved: rows.length }, 200);
}
