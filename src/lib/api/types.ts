// Contratos tipados da API do Railway. Nenhuma chave secreta vive aqui —
// a autenticação é sempre o access token do Supabase da avaliadora logada.

export type EditalStatus =
  | "rascunho"
  | "configuracao"
  | "ativo"
  | "pausado"
  | "encerrado"
  | "arquivado";

export interface ActiveEdital {
  id: string;
  number: string;
  year: number;
  name: string;
  cycle?: string;
  status: EditalStatus;
  maxIndividualScore: number;
  normativeVersionId: string;
}

export interface EditalSummary extends ActiveEdital {
  organ?: string;
  applicationsCount: number;
  approvedCount: number;
  lastSyncAt?: string | null;
  accumulatedCost: number;
}

export type CriterionEvaluationMode = "ai" | "deterministic" | "hybrid" | "human";

export interface CriterionDefinition {
  code: string;
  title: string;
  description: string;
  maximumScore: number;
  eliminatory: boolean;
  bonus: boolean;
  orderIndex: number;
  evaluationMode: CriterionEvaluationMode;
  rubric: unknown;
}

export interface EditalInput {
  number: string;
  year: number;
  name: string;
  cycle?: string;
  organ?: string;
  maxIndividualScore: number;
  normativeVersionId?: string;
  criteria: CriterionDefinition[];
  categories?: { name: string; segments: string[] }[];
  driveFolderUrl?: string;
}

// ---------- Processamento ----------

export const PROCESSING_STAGES = [
  "inventario",
  "download",
  "extracao_textual",
  "analise_visual_seletiva",
  "fragmentacao",
  "indexacao",
  "evidencias_a_c",
  "evidencias_d_g",
  "bonus_h_j",
  "auditoria",
  "parecer",
] as const;

export type ProcessingStage = (typeof PROCESSING_STAGES)[number];

export const STAGE_LABEL: Record<ProcessingStage, string> = {
  inventario: "Inventário",
  download: "Download",
  extracao_textual: "Extração textual",
  analise_visual_seletiva: "Análise visual seletiva",
  fragmentacao: "Fragmentação",
  indexacao: "Indexação",
  evidencias_a_c: "Evidências A–C",
  evidencias_d_g: "Evidências D–G",
  bonus_h_j: "Bônus H–J",
  auditoria: "Auditoria",
  parecer: "Parecer",
};

export type StageState =
  | "aguardando"
  | "na_fila"
  | "processando"
  | "concluido"
  | "falhou"
  | "revisao"
  | "cancelado";

export const STAGE_STATE_LABEL: Record<StageState, string> = {
  aguardando: "Aguardando",
  na_fila: "Na fila",
  processando: "Processando",
  concluido: "Concluído",
  falhou: "Falhou",
  revisao: "Revisão",
  cancelado: "Cancelado",
};

export interface JobStage {
  stage: ProcessingStage;
  orderIndex: number;
  state: StageState;
  attempts: number;
  startedAt?: string | null;
  finishedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable: boolean;
  preserved: boolean;
  cost?: number;
}

export interface ProcessingJob {
  id: string;
  editalId: string;
  applicationId: string;
  status: StageState;
  stages: JobStage[];
  startedAt?: string | null;
  finishedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

// ---------- Inscrições / avaliação ----------

export interface ApplicationSummary {
  id: string;
  editalId: string;
  projectName: string;
  proponentName: string;
  protocol: string;
  category?: string;
  segment?: string;
  proponentType?: "pessoa_fisica" | "pessoa_juridica_ou_coletivo" | null;
  status: string;
  baselineAt?: string | null;
  lastChangeAt?: string | null;
  humanReviewPending: boolean;
  individualTotal?: number | null;
}

export interface CriterionEvaluation {
  code: string;
  title: string;
  maximumScore: number;
  bonus: boolean;
  eliminatory: boolean;
  /** Nota proposta pela análise assistida */
  proposedScore: number | null;
  /** Nota individual da avaliadora */
  evaluatorScore: number | null;
  justification: string | null;
  limitations: string | null;
  alerts: string[];
  evidenceIds: string[];
  humanReviewRequired: boolean;
}

export interface EvaluationDetail {
  id: string;
  applicationId: string;
  editalId: string;
  criteria: CriterionEvaluation[];
  mandatorySubtotal: number;
  bonusSubtotal: number;
  /** Nota individual da avaliadora — nunca uma média entre avaliadores */
  individualTotal: number;
  zeroInMandatoryCriterion: boolean;
  approved: boolean;
  approvedAt?: string | null;
  approvedBy?: string | null;
  locked: boolean;
}

export interface EvidenceItem {
  id: string;
  criterion: string;
  fileId: string | null;
  fileName?: string;
  pageStart?: number | null;
  pageEnd?: number | null;
  description: string;
  excerpt?: string | null;
  robustness: "alta" | "media" | "declaratoria";
  validatedByHuman: boolean;
}

// ---------- Custos ----------

export interface CostRow {
  editalId: string;
  applicationId?: string | null;
  applicationName?: string | null;
  stage?: string | null;
  model?: string | null;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  cost: number;
}

export interface CostReport {
  editalId: string;
  budgetTotal: number;
  limitPerApplication: number;
  blockOnExceed: boolean;
  consumed: number;
  byApplication: CostRow[];
  byStage: CostRow[];
  byModel: CostRow[];
}

// ---------- Sincronização ----------

export interface SyncRun {
  id: string;
  editalId: string;
  status: StageState;
  startedAt: string;
  finishedAt?: string | null;
  stats?: Record<string, number> | null;
  errorMessage?: string | null;
}
