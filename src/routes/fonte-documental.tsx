import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LAST_EDITAL_STORAGE_KEY } from "@/contexts/edital-context";

interface LegacySearch {
  connected?: string;
  google_error?: string;
  google_error_detail?: string;
}

/**
 * Rota antiga mantida apenas para o retorno do OAuth do Google, que não conhece
 * o edital. Reencaminha para a fonte documental do último edital aberto.
 */
export const Route = createFileRoute("/fonte-documental")({
  validateSearch: (search: Record<string, unknown>): LegacySearch => ({
    connected: typeof search.connected === "string" ? search.connected : undefined,
    google_error: typeof search.google_error === "string" ? search.google_error : undefined,
    google_error_detail:
      typeof search.google_error_detail === "string" ? search.google_error_detail : undefined,
  }),
  component: LegacyFonteRedirect,
});

function LegacyFonteRedirect() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    const editalId =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(LAST_EDITAL_STORAGE_KEY)
        : null;
    navigate({
      to: (editalId ? `/editais/${editalId}/fonte-documental` : "/editais") as string,
      search: editalId ? search : {},
      replace: true,
    });
  }, [navigate, search]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Redirecionando…
    </div>
  );
}
