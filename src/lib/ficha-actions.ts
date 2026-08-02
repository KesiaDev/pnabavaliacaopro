// Ponte RPC cliente↔servidor (createServerFn) — mesmo padrão de drive-actions.ts:
// nunca importa *.server.ts no topo, só dentro do corpo de cada .handler().
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

async function requireAdministradora(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "administradora",
  });
  if (error || !data) {
    throw new Error("Apenas a administradora pode executar esta ação.");
  }
}

const CRITERIA_119 = ["A", "B", "C", "D", "E", "F", "G"] as const;
const CRITERIA_120 = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;

// Gera a ficha oficial (.odt) já preenchida com as notas aprovadas e a
// minuta de parecer — só depois que a avaliadora aprovou a avaliação e não
// há nenhuma pendência aberta (mesmo gate de export_ready já usado no resto
// da plataforma). O molde .odt usado depende do edital do proponente: cada
// edital tem seu próprio arquivo oficial fornecido pela SMC, com layout e
// critérios próprios (o 119 tem A-G obrigatório/F-G bônus; o 120 tem A-G
// obrigatório/H-I-J bônus) — não dá pra generalizar num único molde.
// Retorna o binário em base64 porque server functions do TanStack Start
// trafegam JSON.
export const generateFichaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string }) => data)
  .handler(async ({ context, data }) => {
    await requireAdministradora(context.supabase, context.userId);
    const supabase = context.supabase;
    const proponentId = data.proponentId;

    const { data: proponent, error: proponentError } = await supabase
      .from("proponents")
      .select("nome_canonico, tipo_proponente, edital_id")
      .eq("id", proponentId)
      .single();
    if (proponentError || !proponent) throw new Error("Proponente não encontrado.");
    if (!proponent.tipo_proponente) {
      throw new Error(
        "Defina o tipo de proponente (pessoa física ou jurídica/coletivo) na aba Dossiê antes de gerar a ficha.",
      );
    }
    if (!proponent.edital_id) throw new Error("Proponente sem edital vinculado.");

    const { data: edital, error: editalError } = await supabase
      .from("editais")
      .select("number")
      .eq("id", proponent.edital_id)
      .single();
    if (editalError || !edital) throw new Error("Edital do proponente não encontrado.");

    const { data: evaluation, error: evaluationError } = await supabase
      .from("evaluations")
      .select("export_ready")
      .eq("proponent_id", proponentId)
      .single();
    if (evaluationError || !evaluation) throw new Error("Avaliação não encontrada.");
    if (!evaluation.export_ready) {
      throw new Error(
        "A avaliação ainda não foi aprovada pela avaliadora ou tem pendência humana em aberto — a ficha só pode ser gerada depois disso.",
      );
    }

    const { data: scoreRows, error: scoresError } = await supabase
      .from("criterion_scores")
      .select("criterion, approved_score, proposed_score")
      .eq("proponent_id", proponentId);
    if (scoresError || !scoreRows) throw new Error("Não foi possível carregar as notas.");

    const { data: parecer, error: parecerError } = await supabase
      .from("pareceres")
      .select("texto")
      .eq("proponent_id", proponentId)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (parecerError) throw new Error("Não foi possível carregar a minuta de parecer.");
    if (!parecer)
      throw new Error("Nenhuma minuta de parecer foi gerada ainda para este proponente.");

    if (edital.number === "120") {
      const scores = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 };
      for (const criterion of CRITERIA_120) {
        const row = scoreRows.find((r) => r.criterion === criterion);
        scores[criterion] = row?.approved_score ?? row?.proposed_score ?? 0;
      }

      const { buildFichaOdtEdital120 } = await import("@/lib/ficha-generator.server");
      const buffer = buildFichaOdtEdital120({
        // O formulário de inscrição tem um campo de título do projeto, mas a
        // plataforma ainda não extrai esse dado dos documentos -- fica em
        // branco na ficha pra preenchimento manual, em vez de adivinhar.
        nomeProjeto: null,
        nomeProponente: proponent.nome_canonico,
        tipoProponente: proponent.tipo_proponente,
        scores,
        parecerTexto: parecer.texto,
      });

      return {
        base64: buffer.toString("base64"),
        filename: `Ficha de Avaliação - Edital 120-2026 - ${proponent.nome_canonico}.odt`,
      };
    }

    const scores = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
    for (const criterion of CRITERIA_119) {
      const row = scoreRows.find((r) => r.criterion === criterion);
      scores[criterion] = row?.approved_score ?? row?.proposed_score ?? 0;
    }

    const { buildFichaOdt } = await import("@/lib/ficha-generator.server");
    const buffer = buildFichaOdt({
      nomeProponente: proponent.nome_canonico,
      tipoProponente: proponent.tipo_proponente,
      scores,
      parecerTexto: parecer.texto,
    });

    return {
      base64: buffer.toString("base64"),
      filename: `Ficha de Avaliação - Edital 119-2026 - ${proponent.nome_canonico}.odt`,
    };
  });
