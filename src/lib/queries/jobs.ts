import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { editalScopedKey } from "@/contexts/edital-context";
import { applicationsApi, jobsApi } from "@/lib/api/endpoints";
import { isApiConfigured } from "@/lib/api/client";
import {
  PROCESSING_STAGES,
  type JobStage,
  type ProcessingJob,
  type ProcessingStage,
  type StageState,
} from "@/lib/api/types";
import type { Tables } from "@/integrations/supabase/types";

type JobRow = Tables<"processing_jobs">;
type StageRow = Tables<"job_stages">;

function emptyStages(): JobStage[] {
  return PROCESSING_STAGES.map((stage, index) => ({
    stage,
    orderIndex: index,
    state: "aguardando" as StageState,
    attempts: 0,
    retryable: true,
    preserved: true,
  }));
}

function mergeStages(rows: StageRow[]): JobStage[] {
  return emptyStages().map((base) => {
    const row = rows.find((r) => r.stage === base.stage);
    if (!row) return base;
    return {
      ...base,
      state: row.state as StageState,
      attempts: row.attempts,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      errorCode: row.error_code,
      errorMessage: row.error_message,
      retryable: row.retryable,
      preserved: row.preserved,
    };
  });
}

export function useApplicationJob(editalId: string | undefined, applicationId: string | undefined) {
  return useQuery({
    queryKey: editalScopedKey(editalId, "job", applicationId),
    enabled: !!applicationId,
    queryFn: async (): Promise<ProcessingJob | null> => {
      const { data: jobs, error } = await supabase
        .from("processing_jobs")
        .select("*")
        .eq("proponent_id", applicationId!)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const job = (jobs as JobRow[])[0];
      if (!job) return null;

      const { data: stages, error: stagesError } = await supabase
        .from("job_stages")
        .select("*")
        .eq("job_id", job.id)
        .order("order_index", { ascending: true });
      if (stagesError) throw stagesError;

      return {
        id: job.id,
        editalId: job.edital_id,
        applicationId: job.proponent_id ?? "",
        status: job.status as StageState,
        stages: mergeStages((stages ?? []) as StageRow[]),
        startedAt: job.started_at,
        finishedAt: job.finished_at,
        errorCode: job.error_code,
        errorMessage: job.error_message,
      };
    },
  });
}

/** Um trabalho está vivo enquanto alguma etapa não terminou. */
export function isJobActive(job: ProcessingJob | null | undefined): boolean {
  if (!job) return false;
  return job.stages.some((s) => s.state === "processando" || s.state === "na_fila");
}

function requireApi() {
  if (!isApiConfigured()) {
    throw new Error(
      "O serviço de análise (Railway) ainda não está configurado. Defina VITE_API_BASE_URL para iniciar o processamento.",
    );
  }
}

export function useStartProcessing(editalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      requireApi();
      return applicationsApi.process(applicationId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: editalScopedKey(editalId, "job") }),
  });
}

export function useCancelProcessing(editalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      requireApi();
      return applicationsApi.cancel(applicationId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: editalScopedKey(editalId, "job") }),
  });
}

export function useRetryProcessing(editalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      requireApi();
      return applicationsApi.retry(applicationId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: editalScopedKey(editalId, "job") }),
  });
}

export function useRetryStage(editalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { jobId: string; stage: ProcessingStage }) => {
      requireApi();
      return jobsApi.retryStage(input.jobId, input.stage);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: editalScopedKey(editalId, "job") }),
  });
}

// Status agregado do trabalho mais recente de um proponente -- resume os 7
// estados por etapa (job_stage_state) num vocabulário de painel: nunca
// processado, rodando, terminou bem, terminou com erro, ou foi cancelado.
export type OverallProcessingStatus =
  "nao_iniciado" | "em_andamento" | "concluido" | "falhou" | "cancelado";

function classifyOverallStatus(status: StageState): OverallProcessingStatus {
  switch (status) {
    case "concluido":
      return "concluido";
    case "falhou":
      return "falhou";
    case "cancelado":
      return "cancelado";
    default:
      return "em_andamento"; // aguardando | na_fila | processando | revisao
  }
}

export interface ProponentProcessingStatus {
  proponentId: string;
  jobId: string | null;
  status: OverallProcessingStatus;
  updatedAt: string | null;
}

// Visão de todos os proponentes do edital de uma vez -- sem isso, a única
// forma de saber em que pé cada um está era clicar em cada nome, um por
// um, na lista à esquerda. Uma consulta só, nunca 44.
export function useProcessingOverview(editalId: string | undefined) {
  return useQuery({
    queryKey: editalScopedKey(editalId, "processing-overview"),
    enabled: !!editalId,
    queryFn: async (): Promise<Map<string, ProponentProcessingStatus>> => {
      const { data, error } = await supabase
        .from("processing_jobs")
        .select("id, proponent_id, status, updated_at")
        .eq("edital_id", editalId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // A mesma consulta ordenada por created_at desc: a primeira linha
      // que aparecer pra cada proponente já é a mais recente -- não
      // precisa reprocessar se já vimos aquele proponente antes.
      const byProponent = new Map<string, ProponentProcessingStatus>();
      for (const row of (data as JobRow[]) ?? []) {
        if (!row.proponent_id || byProponent.has(row.proponent_id)) continue;
        byProponent.set(row.proponent_id, {
          proponentId: row.proponent_id,
          jobId: row.id,
          status: classifyOverallStatus(row.status as StageState),
          updatedAt: row.updated_at,
        });
      }
      return byProponent;
    },
  });
}

export interface BatchStartResult {
  succeeded: string[];
  failed: { proponentId: string; message: string }[];
}

// Concorrência limitada de propósito: 44 disparos simultâneos batendo no
// Railway/OpenAI ao mesmo tempo é desnecessário (cada proponente já roda
// suas 12 etapas em fila, sem pressa) e arrisca esbarrar em limite de taxa
// da própria OpenAI -- um pool pequeno evita isso sem deixar o lote lento.
const BATCH_CONCURRENCY = 4;

export function useBatchStartProcessing(editalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationIds: string[]): Promise<BatchStartResult> => {
      requireApi();
      const result: BatchStartResult = { succeeded: [], failed: [] };
      const queue = [...applicationIds];

      async function worker() {
        while (queue.length > 0) {
          const id = queue.shift();
          if (!id) return;
          try {
            await applicationsApi.process(id);
            result.succeeded.push(id);
          } catch (err) {
            result.failed.push({
              proponentId: id,
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(BATCH_CONCURRENCY, applicationIds.length) }, worker),
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: editalScopedKey(editalId, "processing-overview") });
      queryClient.invalidateQueries({ queryKey: editalScopedKey(editalId, "job") });
    },
  });
}
