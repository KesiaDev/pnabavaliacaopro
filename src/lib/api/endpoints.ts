import { api } from "./client";
import type {
  ApplicationSummary,
  CostReport,
  EditalInput,
  EditalSummary,
  EvaluationDetail,
  EvidenceItem,
  ProcessingJob,
  SyncRun,
} from "./types";

// Cliente tipado dos endpoints do Railway. Um lugar só para todos os caminhos.
export const editaisApi = {
  health: () => api.get<{ status: string; version?: string }>("/v1/health"),
  list: () => api.get<EditalSummary[]>("/v1/editais"),
  get: (editalId: string) => api.get<EditalSummary>(`/v1/editais/${editalId}`),
  create: (input: EditalInput) => api.post<EditalSummary>("/v1/editais", input),
  update: (editalId: string, input: Partial<EditalInput>) =>
    api.patch<EditalSummary>(`/v1/editais/${editalId}`, input),
  publish: (editalId: string) => api.post<EditalSummary>(`/v1/editais/${editalId}/publish`),
  close: (editalId: string, reason: string) =>
    api.post<EditalSummary>(`/v1/editais/${editalId}/close`, { reason }),
  reopen: (editalId: string, justification: string) =>
    api.post<EditalSummary>(`/v1/editais/${editalId}/reopen`, { justification }),
  costs: (editalId: string) => api.get<CostReport>(`/v1/editais/${editalId}/costs`),
};

export const driveApi = {
  oauthStart: (editalId: string) =>
    api.post<{ url: string }>("/v1/drive/oauth/start", { editalId }),
  setSource: (editalId: string, folderUrl: string) =>
    api.post<{ id: string; folderName: string }>(`/v1/editais/${editalId}/drive-source`, {
      folderUrl,
    }),
  // "sync" (não "incremental") -- bate com o check constraint de sync_runs.kind.
  sync: (editalId: string, kind: "baseline" | "sync" = "sync") =>
    api.post<{ syncRunId: string }>(`/v1/editais/${editalId}/sync`, { kind }),
  syncRun: (syncRunId: string) => api.get<SyncRun>(`/v1/sync-runs/${syncRunId}`),
};

export const applicationsApi = {
  list: (editalId: string) => api.get<ApplicationSummary[]>(`/v1/editais/${editalId}/applications`),
  get: (applicationId: string) => api.get<ApplicationSummary>(`/v1/applications/${applicationId}`),
  process: (applicationId: string) =>
    api.post<{ jobId: string }>(`/v1/applications/${applicationId}/process`),
  evaluate: (applicationId: string) =>
    api.post<{ jobId: string }>(`/v1/applications/${applicationId}/evaluate`),
  retry: (applicationId: string) =>
    api.post<{ jobId: string }>(`/v1/applications/${applicationId}/retry`),
  cancel: (applicationId: string) => api.post<void>(`/v1/applications/${applicationId}/cancel`),
  evidence: (applicationId: string) =>
    api.get<EvidenceItem[]>(`/v1/applications/${applicationId}/evidence`),
  evaluation: (applicationId: string) =>
    api.get<EvaluationDetail>(`/v1/applications/${applicationId}/evaluation`),
  jobs: (applicationId: string) =>
    api.get<ProcessingJob[]>(`/v1/applications/${applicationId}/jobs`),
};

export const jobsApi = {
  get: (jobId: string) => api.get<ProcessingJob>(`/v1/jobs/${jobId}`),
  retryStage: (jobId: string, stage: string) =>
    api.post<ProcessingJob>(`/v1/jobs/${jobId}/retry-stage`, { stage }),
};

export const evaluationsApi = {
  updateCriterion: (
    evaluationId: string,
    criterionCode: string,
    payload: {
      evaluatorScore: number | null;
      justification?: string;
      humanReviewRequired?: boolean;
    },
  ) =>
    api.patch<EvaluationDetail>(
      `/v1/evaluations/${evaluationId}/criteria/${criterionCode}`,
      payload,
    ),
  approve: (evaluationId: string) =>
    api.post<EvaluationDetail>(`/v1/evaluations/${evaluationId}/approve`),
  reopen: (evaluationId: string, justification: string) =>
    api.post<EvaluationDetail>(`/v1/evaluations/${evaluationId}/reopen`, { justification }),
};

export const exportsApi = {
  evaluationSheet: (applicationId: string) =>
    api.postBlob("/v1/exports/evaluation-sheet", { applicationId }),
  summary: (editalId: string) => api.postBlob("/v1/exports/summary", { editalId }),
};
