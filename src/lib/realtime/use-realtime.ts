import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type TableName =
  | "processing_jobs"
  | "job_stages"
  | "evaluations"
  | "criterion_scores"
  | "sync_runs"
  | "cost_entries"
  | "flags"
  | "pareceres";

/**
 * Escuta mudanças em tempo real e invalida o cache correspondente.
 * Se o canal não conectar (ou cair), entra automaticamente em sondagem
 * periódica para que a interface continue atualizando.
 */
export function useRealtimeInvalidation(options: {
  tables: TableName[];
  queryKeys: readonly unknown[][];
  /** Sondagem de reserva em milissegundos enquanto houver trabalho ativo. */
  pollIntervalMs?: number;
  /** Só sonda quando há algo em andamento. */
  active?: boolean;
  enabled?: boolean;
}) {
  const { tables, queryKeys, pollIntervalMs = 5000, active = true, enabled = true } = options;
  const queryClient = useQueryClient();
  const connectedRef = useRef(false);
  const keysRef = useRef(queryKeys);
  keysRef.current = queryKeys;

  const invalidate = useRef(() => {
    for (const key of keysRef.current) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  });

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase.channel(
      `realtime-${tables.join("-")}-${Math.random().toString(36).slice(2)}`,
    );

    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        invalidate.current();
      });
    }

    channel.subscribe((status) => {
      connectedRef.current = status === "SUBSCRIBED";
    });

    return () => {
      connectedRef.current = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tables.join("|")]);

  // Fallback: sondagem enquanto houver trabalho ativo e o canal não estiver de pé.
  useEffect(() => {
    if (!enabled || !active) return;
    const id = setInterval(() => {
      if (!connectedRef.current) invalidate.current();
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [enabled, active, pollIntervalMs]);
}
