// Ponte RPC cliente↔servidor (createServerFn) — mesmo padrão de drive-actions.ts:
// nunca importa *.server.ts no topo, só dentro do corpo de cada .handler().
//
// IMPORTANTE: cada agente é exposto como uma server function independente e o
// cliente chama uma por vez em sequência (ver useRunAgentPipeline). Rodar todos
// os agentes dentro de uma única server function estourava o limite de memória
// do Worker (502 "Worker exceeded memory limit"), porque cada agente baixa
// todos os PDFs do proponente em Buffer + base64 e o heap não era liberado
// entre um agente e outro. Com Workers separados, cada agente ganha memória
// limpa e falhas ficam isoladas por etapa.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Etapa 1 (orquestrador): verifica pré-condições, limpa runs órfãos e libera
// o cliente para chamar os demais agentes um a um.
export const startAgentPipelineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string }) => data)
  .handler(async ({ context, data }) => {
    const { getAuthorizedAdminSupabase, reapStuckRuns } = await import(
      "@/lib/agent-actions.server"
    );
    const supabase = await getAuthorizedAdminSupabase(context.supabase, context.userId);
    const proponentId = data.proponentId;

    await reapStuckRuns(supabase, proponentId);

    const { data: orchestratorRun } = await supabase
      .from("agent_runs")
      .insert({
        proponent_id: proponentId,
        agent_name: "agente_1_orquestrador",
        model: "n/a (determinístico)",
        prompt_version: "v1",
        triggered_by: context.userId,
      })
      .select()
      .single();

    const { count: filesCount } = await supabase
      .from("files")
      .select("id", { count: "exact", head: true })
      .eq("proponent_id", proponentId);

    if (!filesCount || filesCount === 0) {
      if (orchestratorRun) {
        await supabase
          .from("agent_runs")
          .update({
            status: "erro",
            finished_at: new Date().toISOString(),
            error_message: "Nenhum arquivo importado para este proponente — dossiê vazio.",
          })
          .eq("id", orchestratorRun.id);
      }
      throw new Error(
        "Nenhum arquivo importado para este proponente. Sincronize o Drive ou faça upload manual antes de executar os agentes.",
      );
    }

    if (orchestratorRun) {
      await supabase
        .from("agent_runs")
        .update({ status: "concluido", finished_at: new Date().toISOString() })
        .eq("id", orchestratorRun.id);
    }

    return { ok: true as const, filesCount };
  });

export const runAgent3Fn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string }) => data)
  .handler(async ({ context, data }) => {
    const { getAuthorizedAdminSupabase } = await import("@/lib/agent-actions.server");
    const supabase = await getAuthorizedAdminSupabase(context.supabase, context.userId);
    const { runAgent3 } = await import("@/lib/agents/agent3-classification.server");
    return runAgent3(supabase, data.proponentId, context.userId);
  });

// Chamado pelo cliente quando a infraestrutura derruba uma etapa (ex.: 502 por
// memória) antes do catch do agente conseguir finalizar o agent_run. Evita que a
// auditoria fique com linhas eternamente "em_andamento".
export const markAgentStepFailedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string; agentName: string; errorMessage: string }) => data)
  .handler(async ({ context, data }) => {
    const { getAuthorizedAdminSupabase } = await import("@/lib/agent-actions.server");
    const supabase = await getAuthorizedAdminSupabase(context.supabase, context.userId);
    await supabase
      .from("agent_runs")
      .update({
        status: "erro",
        finished_at: new Date().toISOString(),
        error_message: data.errorMessage.slice(0, 1200),
      })
      .eq("proponent_id", data.proponentId)
      .eq("agent_name", data.agentName)
      .eq("status", "em_andamento");
    return { ok: true as const };
  });

export const runAgent4Fn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string }) => data)
  .handler(async ({ context, data }) => {
    const { getAuthorizedAdminSupabase } = await import("@/lib/agent-actions.server");
    const supabase = await getAuthorizedAdminSupabase(context.supabase, context.userId);
    const { runAgent4 } = await import("@/lib/agents/agent4-ciclo1.server");
    return runAgent4(supabase, data.proponentId, context.userId);
  });

export const runAgent5Fn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string }) => data)
  .handler(async ({ context, data }) => {
    const { getAuthorizedAdminSupabase } = await import("@/lib/agent-actions.server");
    const supabase = await getAuthorizedAdminSupabase(context.supabase, context.userId);
    const { runAgent5 } = await import("@/lib/agents/agent5-criterio-a.server");
    return runAgent5(supabase, data.proponentId, context.userId);
  });

// Agente 6 avalia 4 critérios; expomos um por chamada para dar a cada critério
// um Worker próprio (mesmo motivo: base64 de PDFs pesa muito no heap).
export const runAgent6CriterionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string; criterion: "B" | "C" | "D" | "E" }) => data)
  .handler(async ({ context, data }) => {
    const { getAuthorizedAdminSupabase } = await import("@/lib/agent-actions.server");
    const supabase = await getAuthorizedAdminSupabase(context.supabase, context.userId);
    const { runAgent6Criterion } = await import("@/lib/agents/agent6-merito.server");
    return runAgent6Criterion(supabase, data.proponentId, data.criterion, context.userId);
  });

export const runAgent7Fn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string }) => data)
  .handler(async ({ context, data }) => {
    const { getAuthorizedAdminSupabase } = await import("@/lib/agent-actions.server");
    const supabase = await getAuthorizedAdminSupabase(context.supabase, context.userId);
    const { runAgent7 } = await import("@/lib/agents/agent7-bonus.server");
    return runAgent7(supabase, data.proponentId, context.userId);
  });

// Fecha o pipeline: só muda status do proponente se ainda não estiver adiante.
export const finishAgentPipelineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string }) => data)
  .handler(async ({ context, data }) => {
    const { getAuthorizedAdminSupabase } = await import("@/lib/agent-actions.server");
    const supabase = await getAuthorizedAdminSupabase(context.supabase, context.userId);
    const { data: currentProponent } = await supabase
      .from("proponents")
      .select("status")
      .eq("id", data.proponentId)
      .single();
    if (
      currentProponent &&
      ["nao_importado", "importado", "inventariado", "em_analise"].includes(currentProponent.status)
    ) {
      await supabase
        .from("proponents")
        .update({ status: "avaliacao_proposta" })
        .eq("id", data.proponentId);
    }
    return { ok: true as const };
  });

export const approveEvaluationByAgentsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string }) => data)
  .handler(async ({ context, data }) => {
    const { getAuthorizedAdminSupabase } = await import("@/lib/agent-actions.server");
    const supabase = await getAuthorizedAdminSupabase(context.supabase, context.userId);
    const proponentId = data.proponentId;
    const requiredCriteria = ["A", "B", "C", "D", "E", "F", "G"] as const;

    const { data: scores, error: scoresError } = await supabase
      .from("criterion_scores")
      .select("id, criterion, proposed_score, human_review_required")
      .eq("proponent_id", proponentId)
      .order("criterion", { ascending: true });
    if (scoresError || !scores) throw new Error("Não foi possível carregar as notas dos agentes.");

    const byCriterion = new Map(scores.map((score) => [score.criterion, score]));
    const missing = requiredCriteria.filter((criterion) => {
      const score = byCriterion.get(criterion);
      return !score || score.proposed_score == null;
    });
    if (missing.length > 0) {
      throw new Error(
        `Aprovação bloqueada: faltam notas propostas pelos agentes nos critérios ${missing.join(", ")}. Reexecute os agentes antes de aprovar.`,
      );
    }

    const pending = scores
      .filter((score) => score.human_review_required)
      .map((score) => score.criterion);
    if (pending.length > 0) {
      throw new Error(
        `Aprovação bloqueada: os agentes sinalizaram revisão obrigatória nos critérios ${pending.join(", ")}. Resolva reexecutando/processando os documentos antes de finalizar.`,
      );
    }

    for (const score of scores) {
      await supabase
        .from("criterion_scores")
        .update({ approved_score: score.proposed_score, human_review_required: false })
        .eq("id", score.id);
    }

    const { error: evalError } = await supabase
      .from("evaluations")
      .update({ status: "aprovado_pela_avaliadora" })
      .eq("proponent_id", proponentId);
    if (evalError) throw new Error("Não foi possível aprovar a avaliação consolidada.");

    const { error: statusError } = await supabase
      .from("proponents")
      .update({ status: "aprovado_pela_avaliadora" })
      .eq("id", proponentId);
    if (statusError) throw new Error("Não foi possível atualizar o status do proponente.");

    let parecerError: string | null = null;
    try {
      const { runAgent8 } = await import("@/lib/agents/agent8-auditor.server");
      await runAgent8(supabase, proponentId, context.userId);
    } catch (err) {
      parecerError = err instanceof Error ? err.message : String(err);
    }

    return { parecerError };
  });

export const reopenEvaluationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string }) => data)
  .handler(async ({ context, data }) => {
    const { getAuthorizedAdminSupabase } = await import("@/lib/agent-actions.server");
    const supabase = await getAuthorizedAdminSupabase(context.supabase, context.userId);

    await supabase.from("proponents").update({ status: "reaberto" }).eq("id", data.proponentId);
    await supabase
      .from("evaluations")
      .update({ status: "reaberto" })
      .eq("proponent_id", data.proponentId);

    return { ok: true as const };
  });

// Agente 8 (Auditor e Relator) roda separado do restante do squad — só depois
// que todos os critérios têm nota proposta pelos agentes e nenhuma pendência
// aberta. Ele não cria nota: apenas redige a partir das notas já aprovadas.
export const generateParecerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { proponentId: string }) => data)
  .handler(async ({ context, data }) => {
    const { getAuthorizedAdminSupabase } = await import("@/lib/agent-actions.server");
    const supabase = await getAuthorizedAdminSupabase(context.supabase, context.userId);
    const { runAgent8 } = await import("@/lib/agents/agent8-auditor.server");
    return runAgent8(supabase, data.proponentId, context.userId);
  });
