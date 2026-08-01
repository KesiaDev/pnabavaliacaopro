import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { driveApi } from "@/lib/api/endpoints";
import { isApiConfigured } from "@/lib/api/client";
import { disconnectGoogleFn } from "@/lib/drive-actions";

export type DriveConnection = Tables<"drive_connections">;
export type DriveSource = Tables<"drive_sources">;
export type SyncRun = Tables<"sync_runs">;
export type SyncChange = Tables<"sync_changes">;

function requireApi() {
  if (!isApiConfigured()) {
    throw new Error(
      "O serviço de análise (Railway) ainda não está configurado. Defina VITE_API_BASE_URL para conectar o Drive.",
    );
  }
}

export function useActiveDriveConnection() {
  return useQuery({
    queryKey: ["drive_connections", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drive_connections")
        .select("*")
        .is("revoked_at", null)
        .order("connected_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useDriveSource(editalId: string | undefined) {
  return useQuery({
    queryKey: ["drive_sources", editalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drive_sources")
        .select("*")
        .eq("edital_id", editalId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!editalId,
  });
}

export function useLatestSyncRun(driveSourceId: string | undefined) {
  return useQuery({
    queryKey: ["sync_runs", "latest", driveSourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_runs")
        .select("*")
        .eq("drive_source_id", driveSourceId!)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!driveSourceId,
  });
}

export function useSyncChanges(syncRunId: string | undefined) {
  return useQuery({
    queryKey: ["sync_changes", syncRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_changes")
        .select("*, proponents(nome_canonico), files(nome)")
        .eq("sync_run_id", syncRunId!)
        .order("detectado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!syncRunId,
  });
}

export function useRecentSyncChanges() {
  return useQuery({
    queryKey: ["sync_changes", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_changes")
        .select("*, proponents(nome_canonico), files(nome)")
        .order("detectado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

// A partir daqui, tudo que escreve passa pelo Railway (/v1/drive/*) -- ver
// src/lib/api/endpoints.ts. O Worker nunca fala com o Postgres direto (o
// Lovable Cloud não expõe service_role); quem grava é o endpoint interno
// HMAC deste próprio app, chamado pelo Railway.

export function useStartGoogleOAuth(editalId: string | undefined) {
  return useMutation({
    mutationFn: async () => {
      requireApi();
      if (!editalId) throw new Error("Selecione um edital antes de conectar o Google Drive.");
      const { url } = await driveApi.oauthStart(editalId);
      window.location.href = url;
    },
  });
}

// Desconectar ainda não faz parte do contrato /v1/drive/* -- revogar uma
// conexão OAuth existente é uma ação pontual (não passa pelo Worker/fila),
// segue local por enquanto. TODO: mover pro Railway quando o contrato ganhar
// um endpoint de revogação.
export function useDisconnectGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => disconnectGoogleFn({ data: { connectionId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drive_connections"] }),
  });
}

export function useSaveDriveSource(editalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderUrl: string) => {
      requireApi();
      if (!editalId) throw new Error("Selecione um edital antes de definir a pasta-fonte.");
      return driveApi.setSource(editalId, folderUrl);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drive_sources"] }),
  });
}

function useTriggerSync(editalId: string | undefined, kind: "baseline" | "sync") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      requireApi();
      if (!editalId) throw new Error("Selecione um edital antes de sincronizar.");
      return driveApi.sync(editalId, kind);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync_runs"] });
      queryClient.invalidateQueries({ queryKey: ["proponents"] });
      queryClient.invalidateQueries({ queryKey: ["sync_changes"] });
    },
  });
}

export function useRunBaseline(editalId: string | undefined) {
  return useTriggerSync(editalId, "baseline");
}

export function useRunSync(editalId: string | undefined) {
  return useTriggerSync(editalId, "sync");
}
