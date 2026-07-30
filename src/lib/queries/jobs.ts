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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: editalScopedKey(editalId, "job") }),
  });
}

export function useCancelProcessing(editalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      requireApi();
      return applicationsApi.cancel(applicationId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: editalScopedKey(editalId, "job") }),
  });
}

export function useRetryProcessing(editalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      requireApi();
      return applicationsApi.retry(applicationId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: editalScopedKey(editalId, "job") }),
  });
}

export function useRetryStage(editalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { jobId: string; stage: ProcessingStage }) => {
      requireApi();
      return jobsApi.retryStage(input.jobId, input.stage);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: editalScopedKey(editalId, "job") }),
  });
}
