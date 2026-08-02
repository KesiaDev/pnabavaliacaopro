// Server-only (sufixo .server.ts). Chamado direto de src/server.ts, fora do
// roteador do TanStack -- ver internal-jobs.server.ts pro motivo (Seroval
// não sabe serializar um Response cru).
//
// Fase 7: os agentes de avaliação (evidencias_a_c, evidencias_d_g,
// bonus_h_j, auditoria, parecer) rodam no Worker do Railway, que nunca fala
// com o Postgres direto (só service_role escreve nessas tabelas, e o
// Lovable Cloud nunca expõe essa chave pra fora do próprio app). Este
// módulo é a ponte: lê contexto (critérios, chunks relevantes, situação do
// proponente) e grava resultado (nota proposta, evidência, flag, parecer).
import { z } from "zod";
import { verifyInternalRequest, jsonResponse } from "@/lib/internal-auth.server";

export async function handleGetEditalCriteria(
  request: Request,
  params: { editalId: string },
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
  const parsed = z
    .object({ codes: z.array(z.string()).optional() })
    .safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("edital_criteria")
    .select("code, title, description, maximum_score, eliminatory, bonus")
    .eq("edital_id", params.editalId)
    .order("order_index", { ascending: true });
  if (parsed.data.codes && parsed.data.codes.length > 0) {
    query = query.in("code", parsed.data.codes);
  }
  const { data, error } = await query;
  if (error) {
    return jsonResponse({ code: "list_failed", message: error.message }, 500);
  }

  const criteria = (data ?? []).map((c) => ({
    code: c.code as string,
    title: c.title as string,
    description: c.description as string,
    maximumScore: c.maximum_score as number,
    eliminatory: c.eliminatory as boolean,
    bonus: c.bonus as boolean,
  }));
  return jsonResponse({ criteria }, 200);
}

const matchChunksBodySchema = z.object({
  queryEmbedding: z.array(z.number()).min(1),
  matchCount: z.number().int().positive().max(100).optional(),
});

export async function handleMatchDocumentChunks(
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
  const parsed = matchChunksBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const embeddingText = `[${parsed.data.queryEmbedding.join(",")}]`;
  // match_document_chunks é uma RPC criada por migration (Fase 7) --
  // o tipo gerado do Supabase só conhece as funções que existiam quando
  // types.ts foi gerado pela última vez, por isso o cast: a chamada em si
  // já foi validada manualmente contra a assinatura real da função (ver
  // supabase/migrations/20260802121000_match_document_chunks.sql).
  type MatchDocumentChunksRow = {
    id: string;
    file_id: string;
    pagina_inicial: number;
    pagina_final: number;
    texto: string;
    similarity: number;
  };
  const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as (
    fn: "match_document_chunks",
    args: { p_proponent_id: string; p_query_embedding: string; p_match_count: number },
  ) => Promise<{ data: MatchDocumentChunksRow[] | null; error: { message: string } | null }>;
  const { data, error } = await rpc("match_document_chunks", {
    p_proponent_id: params.proponentId,
    p_query_embedding: embeddingText,
    p_match_count: parsed.data.matchCount ?? 20,
  });
  if (error) {
    return jsonResponse({ code: "match_failed", message: error.message }, 500);
  }

  const rows = data ?? [];
  const chunks = rows.map((r) => ({
    chunkId: r.id,
    fileId: r.file_id,
    paginaInicial: r.pagina_inicial,
    paginaFinal: r.pagina_final,
    texto: r.texto,
    similarity: r.similarity,
  }));
  return jsonResponse({ chunks }, 200);
}

export async function handleGetProponentInfo(
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

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("proponents")
    .select("id, nome_canonico, categoria, tipo_proponente, ciclo1_alerta")
    .eq("id", params.proponentId)
    .single();
  if (error || !data) {
    return jsonResponse(
      { code: "not_found", message: error?.message ?? "Proponente não encontrado." },
      404,
    );
  }

  return jsonResponse(
    {
      proponent: {
        id: data.id as string,
        nomeCanonico: data.nome_canonico as string,
        categoria: data.categoria as string | null,
        tipoProponente: data.tipo_proponente as string | null,
        ciclo1Alerta: data.ciclo1_alerta as string | null,
      },
    },
    200,
  );
}

const saveTipoProponenteBodySchema = z.object({
  tipoProponente: z.enum(["pessoa_fisica", "pessoa_juridica_ou_coletivo"]),
});

export async function handleSaveTipoProponente(
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
  const parsed = saveTipoProponenteBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("proponents")
    .update({ tipo_proponente: parsed.data.tipoProponente })
    .eq("id", params.proponentId);
  if (error) {
    return jsonResponse({ code: "save_failed", message: error.message }, 500);
  }
  return jsonResponse({ ok: true }, 200);
}

const evidenceInputSchema = z.object({
  criterion: z.string(),
  fileId: z.string().uuid().nullable(),
  paginaInicial: z.number().int().positive().nullable(),
  paginaFinal: z.number().int().positive().nullable(),
  descricaoFactual: z.string().min(1),
  trechoRelevante: z.string().nullable(),
  robustez: z.enum(["alta", "media", "declaratoria"]),
  criadoPorAgente: z.string().min(1),
});

export async function handleSaveEvidence(
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
  const parsed = z
    .object({ evidences: z.array(evidenceInputSchema).min(1) })
    .safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = parsed.data.evidences.map((e) => ({
    proponent_id: params.proponentId,
    criterion: e.criterion,
    file_id: e.fileId,
    pagina_inicial: e.paginaInicial,
    pagina_final: e.paginaFinal,
    descricao_factual: e.descricaoFactual,
    trecho_relevante: e.trechoRelevante,
    robustez: e.robustez,
    criado_por_agente: e.criadoPorAgente,
  }));
  const { error } = await supabaseAdmin.from("evidence").insert(rows);
  if (error) {
    return jsonResponse({ code: "save_failed", message: error.message }, 500);
  }
  return jsonResponse({ ok: true, saved: rows.length }, 200);
}

const criterionScoreInputSchema = z.object({
  criterion: z.string(),
  proposedScore: z.number().int().nonnegative(),
  appliedBand: z.string().nullable(),
  justification: z.string().min(1),
  humanReviewRequired: z.boolean(),
});

export async function handleSaveCriterionScores(
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
  const parsed = z
    .object({ scores: z.array(criterionScoreInputSchema).min(1) })
    .safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // UPDATE por linha, nunca upsert: a linha já existe pra todo proponente
  // (seed_criterion_scores() cria uma por critério do edital ao criar o
  // proponente) e o payload nunca inclui approved_score/max_score -- nota
  // da avaliadora é soberana, o agente nunca escreve por cima dela (ADR-6/
  // [[feedback-pnab-human-review]]). Se a linha não existir por algum
  // motivo, o UPDATE afeta 0 linhas e isso vira aviso, não erro silencioso.
  const missing: string[] = [];
  for (const s of parsed.data.scores) {
    const { error, count } = await supabaseAdmin
      .from("criterion_scores")
      .update(
        {
          proposed_score: s.proposedScore,
          applied_band: s.appliedBand,
          justification: s.justification,
          human_review_required: s.humanReviewRequired,
        },
        { count: "exact" },
      )
      .eq("proponent_id", params.proponentId)
      .eq("criterion", s.criterion);
    if (error) {
      return jsonResponse({ code: "save_failed", message: error.message }, 500);
    }
    if (!count) missing.push(s.criterion);
  }

  if (missing.length > 0) {
    return jsonResponse(
      {
        code: "criteria_not_seeded",
        message: `criterion_scores não tem linha pra: ${missing.join(", ")} -- proponente pode não ter sido semeado a partir de edital_criteria.`,
      },
      409,
    );
  }
  return jsonResponse({ ok: true, saved: parsed.data.scores.length }, 200);
}

const flagInputSchema = z.object({
  tipo: z.enum([
    "ciclo1_exata",
    "ciclo1_provavel",
    "conteudo_discriminatorio",
    "divergencia_documental",
    "outro",
  ]),
  descricao: z.string().min(1),
  fileId: z.string().uuid().nullable().optional(),
  pagina: z.number().int().positive().nullable().optional(),
  criadoPorAgente: z.string().min(1),
});

export async function handleSaveFlag(
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
  const parsed = flagInputSchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("flags").insert({
    proponent_id: params.proponentId,
    tipo: parsed.data.tipo,
    descricao: parsed.data.descricao,
    file_id: parsed.data.fileId ?? null,
    pagina: parsed.data.pagina ?? null,
    criado_por_agente: parsed.data.criadoPorAgente,
  });
  if (error) {
    return jsonResponse({ code: "save_failed", message: error.message }, 500);
  }
  return jsonResponse({ ok: true }, 200);
}

const costEntryBodySchema = z.object({
  editalId: z.string().uuid(),
  proponentId: z.string().uuid().nullable(),
  stage: z.string().min(1),
  model: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
});

export async function handleSaveCostEntry(request: Request): Promise<Response> {
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
  const parsed = costEntryBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("cost_entries").insert({
    edital_id: parsed.data.editalId,
    proponent_id: parsed.data.proponentId,
    stage: parsed.data.stage,
    model: parsed.data.model,
    input_tokens: parsed.data.inputTokens,
    output_tokens: parsed.data.outputTokens,
    cost: parsed.data.cost,
  });
  if (error) {
    return jsonResponse({ code: "save_failed", message: error.message }, 500);
  }
  return jsonResponse({ ok: true }, 200);
}

export async function handleGetEvaluationContext(
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

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [proponentRes, scoresRes, evidenceRes, evaluationRes] = await Promise.all([
    supabaseAdmin.from("proponents").select("nome_canonico").eq("id", params.proponentId).single(),
    supabaseAdmin
      .from("criterion_scores")
      .select("criterion, max_score, proposed_score, approved_score, applied_band, justification")
      .eq("proponent_id", params.proponentId),
    supabaseAdmin.from("evidence").select("criterion").eq("proponent_id", params.proponentId),
    supabaseAdmin
      .from("evaluations")
      .select("mandatory_subtotal, bonus_subtotal, individual_total, zero_in_mandatory_criterion")
      .eq("proponent_id", params.proponentId)
      .maybeSingle(),
  ]);

  if (proponentRes.error || !proponentRes.data) {
    return jsonResponse(
      { code: "not_found", message: proponentRes.error?.message ?? "Proponente não encontrado." },
      404,
    );
  }
  if (scoresRes.error) {
    return jsonResponse({ code: "list_failed", message: scoresRes.error.message }, 500);
  }

  const evidenceCountByCriterion: Record<string, number> = {};
  for (const row of evidenceRes.data ?? []) {
    const criterion = row.criterion as string;
    evidenceCountByCriterion[criterion] = (evidenceCountByCriterion[criterion] ?? 0) + 1;
  }

  return jsonResponse(
    {
      proponentNome: proponentRes.data.nome_canonico as string,
      criterionScores: (scoresRes.data ?? []).map((s) => ({
        criterion: s.criterion as string,
        maxScore: s.max_score as number,
        proposedScore: s.proposed_score as number | null,
        approvedScore: s.approved_score as number | null,
        appliedBand: s.applied_band as string | null,
        justification: s.justification as string | null,
      })),
      evidenceCountByCriterion,
      mandatorySubtotal: (evaluationRes.data?.mandatory_subtotal as number | undefined) ?? 0,
      bonusSubtotal: (evaluationRes.data?.bonus_subtotal as number | undefined) ?? 0,
      individualTotal: (evaluationRes.data?.individual_total as number | undefined) ?? 0,
      zeroInMandatoryCriterion:
        (evaluationRes.data?.zero_in_mandatory_criterion as boolean | undefined) ?? false,
    },
    200,
  );
}

function normalizeName(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export async function handleCheckCycle1Match(
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

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [proponentRes, aliasesRes, awardeesRes] = await Promise.all([
    supabaseAdmin.from("proponents").select("nome_canonico").eq("id", params.proponentId).single(),
    supabaseAdmin.from("proponent_aliases").select("alias").eq("proponent_id", params.proponentId),
    // Só as páginas referentes ao Edital nº 231/2024 são usadas pra
    // checagem do Ciclo 1 (ver Documentos normativos, regra explícita).
    supabaseAdmin.from("cycle1_awardees").select("nome").eq("origem_edital", "231/2024"),
  ]);

  if (proponentRes.error || !proponentRes.data) {
    return jsonResponse(
      { code: "not_found", message: proponentRes.error?.message ?? "Proponente não encontrado." },
      404,
    );
  }
  if (awardeesRes.error) {
    return jsonResponse({ code: "list_failed", message: awardeesRes.error.message }, 500);
  }

  const names = [
    proponentRes.data.nome_canonico as string,
    ...(aliasesRes.data ?? []).map((a) => a.alias as string),
  ].map(normalizeName);
  const awardees = (awardeesRes.data ?? []).map((a) => ({
    original: a.nome as string,
    normalized: normalizeName(a.nome as string),
  }));

  let match: "exata" | "provavel" | "sem_correspondencia" = "sem_correspondencia";
  let awardeeName: string | null = null;

  for (const awardee of awardees) {
    if (names.includes(awardee.normalized)) {
      match = "exata";
      awardeeName = awardee.original;
      break;
    }
  }
  if (match === "sem_correspondencia") {
    for (const awardee of awardees) {
      const hit = names.some(
        (n) =>
          n.length > 4 &&
          awardee.normalized.length > 4 &&
          (n.includes(awardee.normalized) || awardee.normalized.includes(n)),
      );
      if (hit) {
        match = "provavel";
        awardeeName = awardee.original;
        break;
      }
    }
  }

  return jsonResponse({ match, awardeeName, totalAwardeesOnFile: awardees.length }, 200);
}

const saveParecerBodySchema = z.object({ texto: z.string().min(1) });

export async function handleSaveParecer(
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
  const parsed = saveParecerBodySchema.safeParse(JSON.parse(auth.body ?? "{}"));
  if (!parsed.success) {
    return jsonResponse({ code: "invalid_body", message: parsed.error.message }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("pareceres")
    .select("id", { count: "exact", head: true })
    .eq("proponent_id", params.proponentId);
  const versao = (count ?? 0) + 1;

  const { error } = await supabaseAdmin.from("pareceres").insert({
    proponent_id: params.proponentId,
    versao,
    texto: parsed.data.texto,
    gerado_por_agente: "agente_parecer",
  });
  if (error) {
    return jsonResponse({ code: "save_failed", message: error.message }, 500);
  }
  return jsonResponse({ ok: true, versao }, 200);
}
