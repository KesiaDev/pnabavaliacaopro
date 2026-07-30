import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorDetail } from "@/components/error-detail";
import { ProcessingActions, ProcessingTimeline } from "@/components/processing-timeline";
import { editalScopedKey, useEditalContext } from "@/contexts/edital-context";
import {
  isJobActive,
  useApplicationJob,
  useCancelProcessing,
  useRetryProcessing,
  useRetryStage,
  useStartProcessing,
} from "@/lib/queries/jobs";
import { useRealtimeInvalidation } from "@/lib/realtime/use-realtime";
import { cn } from "@/lib/utils";

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

  const start = useStartProcessing(editalId);
  const cancel = useCancelProcessing(editalId);
  const retry = useRetryProcessing(editalId);
  const retryStage = useRetryStage(editalId);

  useRealtimeInvalidation({
    tables: ["processing_jobs", "job_stages"],
    queryKeys: useMemo(
      () => [editalScopedKey(editalId, "job", applicationId) as unknown as unknown[]],
      [editalId, applicationId],
    ),
    active: running,
  });

  const mutationError =
    start.error ?? cancel.error ?? retry.error ?? retryStage.error ?? jobQuery.error;

  return (
    <AppShell
      title="Processamento"
      subtitle="O trabalho roda no servidor de análise. Você pode fechar a página sem perder nada."
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Proponentes</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {(proponents ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors truncate",
                  p.id === applicationId ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
                )}
              >
                {p.nome_canonico}
              </button>
            ))}
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
                  job
                    ? (stage) => retryStage.mutate({ jobId: job.id, stage })
                    : undefined
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
