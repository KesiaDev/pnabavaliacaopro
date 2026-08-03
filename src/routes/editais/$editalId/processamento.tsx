import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorDetail } from "@/components/error-detail";
import { ProcessingActions, ProcessingTimeline } from "@/components/processing-timeline";
import { editalScopedKey, useEditalContext } from "@/contexts/edital-context";
import {
  isJobActive,
  useApplicationJob,
  useBatchStartProcessing,
  useCancelProcessing,
  useProcessingOverview,
  useRetryProcessing,
  useRetryStage,
  useStartProcessing,
  type BatchStartResult,
  type OverallProcessingStatus,
} from "@/lib/queries/jobs";
import { useRealtimeInvalidation } from "@/lib/realtime/use-realtime";
import { cn } from "@/lib/utils";

const OVERVIEW_TONE: Record<
  OverallProcessingStatus,
  "neutral" | "info" | "warning" | "success" | "danger"
> = {
  nao_iniciado: "neutral",
  em_andamento: "info",
  concluido: "success",
  falhou: "danger",
  cancelado: "warning",
};

const OVERVIEW_LABEL: Record<OverallProcessingStatus, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  falhou: "Falhou",
  cancelado: "Cancelado",
};

export const Route = createFileRoute("/editais/$editalId/processamento")({
  head: () => ({
    meta: [
      { title: "Processamento — PNAB Avaliação Pro" },
      {
        name: "description",
        content:
          "Acompanhe as etapas de análise de cada proponente, com repetição por etapa e custos.",
      },
      { property: "og:title", content: "Processamento — PNAB Avaliação Pro" },
      { property: "og:description", content: "Etapas de análise por proponente, em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProcessamentoPage,
});

function ProcessamentoPage() {
  const { editalId } = useParams({ from: "/editais/$editalId/processamento" });
  const { readOnly } = useEditalContext();
  const [selected, setSelected] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [batchResult, setBatchResult] = useState<BatchStartResult | null>(null);

  const { data: proponents } = useQuery({
    queryKey: editalScopedKey(editalId, "proponents", "processamento"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proponents")
        .select("id, nome_canonico, status")
        .eq("edital_id", editalId)
        .order("nome_canonico");
      if (error) throw error;
      return data;
    },
  });

  const applicationId = selected ?? proponents?.[0]?.id;
  const jobQuery = useApplicationJob(editalId, applicationId);
  const job = jobQuery.data ?? null;
  const running = isJobActive(job);

  const overview = useProcessingOverview(editalId);
  const statusOf = (id: string): OverallProcessingStatus =>
    overview.data?.get(id)?.status ?? "nao_iniciado";

  const start = useStartProcessing(editalId);
  const cancel = useCancelProcessing(editalId);
  const retry = useRetryProcessing(editalId);
  const retryStage = useRetryStage(editalId);
  const batchStart = useBatchStartProcessing(editalId);

  useRealtimeInvalidation({
    tables: ["processing_jobs", "job_stages"],
    queryKeys: useMemo(
      () => [editalScopedKey(editalId, "job", applicationId) as unknown as unknown[]],
      [editalId, applicationId],
    ),
    active: running,
  });

  // Painel geral (todos os proponentes, não só o selecionado) -- sempre
  // ativo, independente de qual proponente está aberto no detalhe.
  useRealtimeInvalidation({
    tables: ["processing_jobs"],
    queryKeys: useMemo(
      () => [editalScopedKey(editalId, "processing-overview") as unknown as unknown[]],
      [editalId],
    ),
  });

  // Some da seleção proponentes que já foram concluídos ou removidos da
  // lista entretanto, pra "N selecionados" nunca contar algo que já não
  // existe mais.
  useEffect(() => {
    if (!proponents) return;
    const validIds = new Set(proponents.map((p) => p.id));
    setCheckedIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [proponents]);

  const summary = useMemo(() => {
    const counts: Record<OverallProcessingStatus, number> = {
      nao_iniciado: 0,
      em_andamento: 0,
      concluido: 0,
      falhou: 0,
      cancelado: 0,
    };
    for (const p of proponents ?? []) counts[statusOf(p.id)] += 1;
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proponents, overview.data]);

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllPending() {
    setCheckedIds(
      new Set((proponents ?? []).filter((p) => statusOf(p.id) === "nao_iniciado").map((p) => p.id)),
    );
  }

  async function handleBatchStart() {
    const ids = [...checkedIds];
    if (ids.length === 0) return;
    setBatchResult(null);
    const result = await batchStart.mutateAsync(ids);
    setBatchResult(result);
    setCheckedIds(new Set());
  }

  const mutationError =
    start.error ??
    cancel.error ??
    retry.error ??
    retryStage.error ??
    jobQuery.error ??
    batchStart.error;

  return (
    <AppShell
      title="Processamento"
      subtitle="O trabalho roda no servidor de análise. Você pode fechar a página sem perder nada."
    >
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-2 space-y-3">
            <CardTitle className="text-sm">Proponentes</CardTitle>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {(
                [
                  ["concluido", summary.concluido],
                  ["em_andamento", summary.em_andamento],
                  ["falhou", summary.falhou],
                  ["cancelado", summary.cancelado],
                  ["nao_iniciado", summary.nao_iniciado],
                ] as [OverallProcessingStatus, number][]
              )
                .filter(([, count]) => count > 0)
                .map(([status, count]) => (
                  <span key={status}>
                    {count} {OVERVIEW_LABEL[status].toLowerCase()}
                  </span>
                ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={readOnly || !proponents?.length}
                onClick={selectAllPending}
              >
                Selecionar não iniciados
              </Button>
              {checkedIds.size > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setCheckedIds(new Set())}
                >
                  Limpar
                </Button>
              )}
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={readOnly || checkedIds.size === 0 || batchStart.isPending}
              onClick={handleBatchStart}
            >
              {batchStart.isPending
                ? "Iniciando…"
                : `Iniciar processamento${checkedIds.size > 0 ? ` (${checkedIds.size})` : ""}`}
            </Button>
            {batchResult && (
              <p className="text-[11px] text-muted-foreground">
                {batchResult.succeeded.length} iniciado(s)
                {batchResult.failed.length > 0
                  ? ` · ${batchResult.failed.length} falharam ao iniciar`
                  : ""}
                .
              </p>
            )}
          </CardHeader>
          <CardContent className="p-2">
            {(proponents ?? []).map((p) => {
              const status = statusOf(p.id);
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    p.id === applicationId
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/60",
                  )}
                >
                  <Checkbox
                    checked={checkedIds.has(p.id)}
                    disabled={readOnly}
                    onCheckedChange={() => toggleChecked(p.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={() => setSelected(p.id)}
                    className="flex-1 text-left truncate min-w-0"
                    title={p.nome_canonico}
                  >
                    {p.nome_canonico}
                  </button>
                  <StatusBadge tone={OVERVIEW_TONE[status]}>{OVERVIEW_LABEL[status]}</StatusBadge>
                </div>
              );
            })}
            {!proponents?.length && (
              <p className="px-3 py-6 text-sm text-muted-foreground">
                Nenhum proponente importado neste edital.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {mutationError && (
            <ErrorDetail error={mutationError} onRetry={() => jobQuery.refetch()} />
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Etapas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {applicationId && (
                <ProcessingActions
                  running={running}
                  disabled={readOnly}
                  onStart={() => start.mutate(applicationId)}
                  onPause={() => cancel.mutate(applicationId)}
                  onCancel={() => cancel.mutate(applicationId)}
                  onRetry={() => retry.mutate(applicationId)}
                />
              )}
              <ProcessingTimeline
                job={job}
                disabled={readOnly}
                onRetryStage={
                  job ? (stage) => retryStage.mutate({ jobId: job.id, stage }) : undefined
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
