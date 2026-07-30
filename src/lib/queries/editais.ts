import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type {
  CriterionDefinition,
  EditalStatus,
  EditalSummary,
  ActiveEdital,
} from "@/lib/api/types";

export type EditalRow = Tables<"editais">;
export type EditalCriterionRow = Tables<"edital_criteria">;

export const EDITAL_STATUS_LABEL: Record<EditalStatus, string> = {
  rascunho: "Rascunho",
  configuracao: "Em configuração",
  ativo: "Em avaliação",
  pausado: "Pausado",
  encerrado: "Encerrado",
  arquivado: "Arquivado",
};

export const EDITAL_STATUS_TONE: Record<EditalStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  configuracao: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ativo: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  pausado: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  encerrado: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  arquivado: "bg-muted text-muted-foreground",
};

/** Um edital encerrado ou arquivado é somente leitura. */
export function isEditalReadOnly(status: EditalStatus | undefined | null): boolean {
  return status === "encerrado" || status === "arquivado";
}

export function toActiveEdital(row: EditalRow): ActiveEdital {
  return {
    id: row.id,
    number: row.number,
    year: row.year,
    name: row.name,
    cycle: row.cycle ?? undefined,
    status: row.status as EditalStatus,
    maxIndividualScore: row.max_individual_score,
    normativeVersionId: row.normative_version_id ?? "",
  };
}

export const editaisKeys = {
  all: ["editais"] as const,
  list: () => ["editais", "list"] as const,
  detail: (editalId: string) => ["editais", editalId] as const,
  criteria: (editalId: string) => ["editais", editalId, "criteria"] as const,
  summary: (editalId: string) => ["editais", editalId, "summary"] as const,
};

export function useEditais() {
  return useQuery({
    queryKey: editaisKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editais")
        .select("*")
        .order("year", { ascending: false })
        .order("number", { ascending: false });
      if (error) throw error;
      return data as EditalRow[];
    },
  });
}

/** Métricas por edital para a tela de listagem. */
export function useEditaisOverview() {
  const editais = useEditais();
  return useQuery({
    queryKey: [...editaisKeys.list(), "overview"],
    enabled: !!editais.data,
    queryFn: async (): Promise<EditalSummary[]> => {
      const rows = editais.data ?? [];
      const [{ data: proponents }, { data: costs }, { data: syncs }] = await Promise.all([
        supabase.from("proponents").select("id, edital_id, status"),
        supabase.from("cost_entries").select("edital_id, cost"),
        supabase
          .from("sync_runs")
          .select("edital_id, finished_at")
          .order("finished_at", { ascending: false }),
      ]);

      return rows.map((row) => {
        const mine = (proponents ?? []).filter((p) => p.edital_id === row.id);
        return {
          ...toActiveEdital(row),
          organ: row.organ ?? undefined,
          applicationsCount: mine.length,
          approvedCount: mine.filter(
            (p) => p.status === "aprovado_pela_avaliadora" || p.status === "finalizado",
          ).length,
          lastSyncAt:
            (syncs ?? []).find((s) => s.edital_id === row.id)?.finished_at ?? null,
          accumulatedCost: (costs ?? [])
            .filter((c) => c.edital_id === row.id)
            .reduce((acc, c) => acc + Number(c.cost ?? 0), 0),
        };
      });
    },
  });
}

export function useEdital(editalId: string | undefined) {
  return useQuery({
    queryKey: editaisKeys.detail(editalId ?? "none"),
    enabled: !!editalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editais")
        .select("*")
        .eq("id", editalId!)
        .maybeSingle();
      if (error) throw error;
      return data as EditalRow | null;
    },
  });
}

export function useEditalCriteria(editalId: string | undefined) {
  return useQuery({
    queryKey: editaisKeys.criteria(editalId ?? "none"),
    enabled: !!editalId,
    queryFn: async (): Promise<CriterionDefinition[]> => {
      const { data, error } = await supabase
        .from("edital_criteria")
        .select("*")
        .eq("edital_id", editalId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as EditalCriterionRow[]).map((c) => ({
        code: c.code,
        title: c.title,
        description: c.description,
        maximumScore: c.maximum_score,
        eliminatory: c.eliminatory,
        bonus: c.bonus,
        orderIndex: c.order_index,
        evaluationMode: c.evaluation_mode as CriterionDefinition["evaluationMode"],
        rubric: c.rubric,
      }));
    },
  });
}

export interface NewEditalPayload {
  number: string;
  year: number;
  name: string;
  cycle?: string;
  organ?: string;
  maxIndividualScore: number;
  criteria: CriterionDefinition[];
  categories: { name: string; segments: string[] }[];
  driveFolderUrl?: string;
}

export function useCreateEdital() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NewEditalPayload) => {
      const { data: edital, error } = await supabase
        .from("editais")
        .insert({
          number: payload.number,
          year: payload.year,
          name: payload.name,
          cycle: payload.cycle || null,
          organ: payload.organ || null,
          max_individual_score: payload.maxIndividualScore,
          status: "configuracao",
        })
        .select()
        .single();
      if (error) throw error;

      if (payload.criteria.length) {
        const { error: critError } = await supabase.from("edital_criteria").insert(
          payload.criteria.map((c) => ({
            edital_id: edital.id,
            code: c.code,
            title: c.title,
            description: c.description,
            maximum_score: c.maximumScore,
            eliminatory: c.eliminatory,
            bonus: c.bonus,
            order_index: c.orderIndex,
            evaluation_mode: c.evaluationMode,
            rubric: (c.rubric ?? {}) as never,
          })),
        );
        if (critError) throw critError;
      }

      for (const [index, category] of payload.categories.entries()) {
        const { data: cat, error: catError } = await supabase
          .from("edital_categories")
          .insert({ edital_id: edital.id, name: category.name, order_index: index })
          .select()
          .single();
        if (catError) throw catError;
        if (category.segments.length) {
          const { error: segError } = await supabase.from("edital_segments").insert(
            category.segments.map((name, i) => ({
              edital_id: edital.id,
              category_id: cat.id,
              name,
              order_index: i,
            })),
          );
          if (segError) throw segError;
        }
      }

      await supabase
        .from("edital_costs")
        .insert({ edital_id: edital.id, budget_total: 0, limit_per_application: 0 });

      return edital as EditalRow;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: editaisKeys.all }),
  });
}

export function useDuplicateEditalConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sourceId: string; number: string; year: number; name: string }) => {
      const { data: source, error: srcError } = await supabase
        .from("editais")
        .select("*")
        .eq("id", input.sourceId)
        .single();
      if (srcError) throw srcError;

      const { data: created, error } = await supabase
        .from("editais")
        .insert({
          number: input.number,
          year: input.year,
          name: input.name,
          cycle: source.cycle,
          organ: source.organ,
          max_individual_score: source.max_individual_score,
          status: "rascunho",
        })
        .select()
        .single();
      if (error) throw error;

      const { data: criteria } = await supabase
        .from("edital_criteria")
        .select("*")
        .eq("edital_id", input.sourceId);
      if (criteria?.length) {
        await supabase.from("edital_criteria").insert(
          criteria.map((c) => ({
            edital_id: created.id,
            code: c.code,
            title: c.title,
            description: c.description,
            maximum_score: c.maximum_score,
            eliminatory: c.eliminatory,
            bonus: c.bonus,
            order_index: c.order_index,
            evaluation_mode: c.evaluation_mode,
            rubric: c.rubric,
          })),
        );
      }
      await supabase
        .from("edital_costs")
        .insert({ edital_id: created.id, budget_total: 0, limit_per_application: 0 });
      return created as EditalRow;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: editaisKeys.all }),
  });
}

export function useUpdateEditalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { editalId: string; status: EditalStatus; reason?: string }) => {
      const patch: Record<string, unknown> = {
        status: input.status,
        updated_at: new Date().toISOString(),
      };
      if (input.status === "encerrado") {
        patch.closed_at = new Date().toISOString();
        patch.closed_reason = input.reason ?? null;
      }
      if (input.status === "ativo" && input.reason) {
        patch.reopened_reason = input.reason;
        patch.closed_at = null;
      }
      const { error } = await supabase.from("editais").update(patch).eq("id", input.editalId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: editaisKeys.all }),
  });
}
