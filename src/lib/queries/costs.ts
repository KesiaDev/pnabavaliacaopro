import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { editalScopedKey } from "@/contexts/edital-context";
import type { Tables } from "@/integrations/supabase/types";

export type CostEntryRow = Tables<"cost_entries">;
export type EditalCostsRow = Tables<"edital_costs">;

export interface CostBucket {
  key: string;
  label: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  cost: number;
}

function bucketize(
  rows: CostEntryRow[],
  keyOf: (row: CostEntryRow) => string,
  labelOf: (row: CostEntryRow) => string,
): CostBucket[] {
  const map = new Map<string, CostBucket>();
  for (const row of rows) {
    const key = keyOf(row) || "—";
    const current = map.get(key) ?? {
      key,
      label: labelOf(row) || "—",
      inputTokens: 0,
      cachedTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
    current.inputTokens += Number(row.input_tokens ?? 0);
    current.cachedTokens += Number(row.cached_tokens ?? 0);
    current.outputTokens += Number(row.output_tokens ?? 0);
    current.cost += Number(row.cost ?? 0);
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

export function useEditalCosts(editalId: string | undefined) {
  return useQuery({
    queryKey: editalScopedKey(editalId, "costs"),
    enabled: !!editalId,
    queryFn: async () => {
      const [{ data: entries, error }, { data: config }, { data: proponents }] = await Promise.all([
        supabase.from("cost_entries").select("*").eq("edital_id", editalId!),
        supabase.from("edital_costs").select("*").eq("edital_id", editalId!).maybeSingle(),
        supabase.from("proponents").select("id, nome_canonico").eq("edital_id", editalId!),
      ]);
      if (error) throw error;

      const rows = (entries ?? []) as CostEntryRow[];
      const nameOf = (id: string | null) =>
        (proponents ?? []).find((p) => p.id === id)?.nome_canonico ?? "Sem proponente";

      const consumed = rows.reduce((acc, r) => acc + Number(r.cost ?? 0), 0);
      const budget = Number(config?.budget_total ?? 0);

      return {
        config: (config ?? null) as EditalCostsRow | null,
        consumed,
        budget,
        usedRatio: budget > 0 ? consumed / budget : 0,
        byApplication: bucketize(
          rows,
          (r) => r.proponent_id ?? "none",
          (r) => nameOf(r.proponent_id),
        ),
        byStage: bucketize(
          rows,
          (r) => r.stage,
          (r) => r.stage,
        ),
        byModel: bucketize(
          rows,
          (r) => r.model,
          (r) => r.model,
        ),
      };
    },
  });
}

export function useUpdateCostConfig(editalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      budgetTotal: number;
      limitPerApplication: number;
      blockOnExceed: boolean;
    }) => {
      const { error } = await supabase.from("edital_costs").upsert(
        {
          edital_id: editalId!,
          budget_total: input.budgetTotal,
          limit_per_application: input.limitPerApplication,
          block_on_exceed: input.blockOnExceed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "edital_id" },
      );
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: editalScopedKey(editalId, "costs") }),
  });
}

/** Alertas de 50%, 75% e 90% do orçamento. */
export function costAlertLevel(usedRatio: number): 50 | 75 | 90 | null {
  if (usedRatio >= 0.9) return 90;
  if (usedRatio >= 0.75) return 75;
  if (usedRatio >= 0.5) return 50;
  return null;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}
