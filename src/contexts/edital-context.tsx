import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import type { ActiveEdital } from "@/lib/api/types";
import { isEditalReadOnly, toActiveEdital, useEdital, useEditais } from "@/lib/queries/editais";

/** Guarda o último edital aberto para retornos externos (ex.: OAuth do Google). */
export const LAST_EDITAL_STORAGE_KEY = "pnab:last-edital-id";

interface EditalContextValue {
  editalId: string | undefined;
  edital: ActiveEdital | null;
  editais: ActiveEdital[];
  loading: boolean;
  /** Encerrado ou arquivado: só consulta e exportação. */
  readOnly: boolean;
  switchEdital: (nextId: string) => void;
}

const EditalContext = createContext<EditalContextValue | null>(null);

export function EditalProvider({ children }: { children: ReactNode }) {
  const params = useParams({ strict: false }) as { editalId?: string };
  const editalId = params.editalId;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: list, isLoading: listLoading } = useEditais();
  const { data: row, isLoading: rowLoading } = useEdital(editalId);

  const editais = useMemo(() => (list ?? []).map(toActiveEdital), [list]);
  const edital = row ? toActiveEdital(row) : null;

  const value = useMemo<EditalContextValue>(
    () => ({
      editalId,
      edital,
      editais,
      loading: listLoading || (!!editalId && rowLoading),
      readOnly: isEditalReadOnly(edital?.status),
      switchEdital: (nextId: string) => {
        if (!nextId || nextId === editalId) return;
        // Nada do edital anterior pode sobrar em cache: derrubamos tudo que é
        // escopado por edital antes de navegar.
        queryClient.removeQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey[0] === "edital-scope",
        });
        queryClient.removeQueries({ queryKey: ["editais"], exact: false, type: "inactive" });

        const suffix = editalId
          ? pathname.split(`/editais/${editalId}`)[1] || "/painel"
          : "/painel";
        // Rotas com identificador de proponente não sobrevivem à troca.
        const safeSuffix = /\/(proponentes|processamento)\/[^/]+/.test(suffix)
          ? suffix.replace(/\/(proponentes|processamento)\/[^/]+.*/, "/$1")
          : suffix;
        navigate({ to: `/editais/${nextId}${safeSuffix}` as string });
      },
    }),
    [editalId, edital, editais, listLoading, rowLoading, pathname, navigate, queryClient],
  );

  return <EditalContext.Provider value={value}>{children}</EditalContext.Provider>;
}

export function useEditalContext(): EditalContextValue {
  const ctx = useContext(EditalContext);
  if (!ctx) throw new Error("useEditalContext precisa estar dentro de <EditalProvider>");
  return ctx;
}

/** Chave de cache sempre prefixada pelo edital — evita mistura entre editais. */
export function editalScopedKey(editalId: string | undefined, ...parts: unknown[]) {
  return ["edital-scope", editalId ?? "none", ...parts] as const;
}
