import { createFileRoute } from "@tanstack/react-router";
import { FonteDocumental } from "@/pages/fonte-documental";

interface FonteSearch {
  connected?: string;
  google_error?: string;
  google_error_detail?: string;
}

export const Route = createFileRoute("/editais/$editalId/fonte-documental")({
  validateSearch: (search: Record<string, unknown>): FonteSearch => ({
    connected: typeof search.connected === "string" ? search.connected : undefined,
    google_error: typeof search.google_error === "string" ? search.google_error : undefined,
    google_error_detail:
      typeof search.google_error_detail === "string" ? search.google_error_detail : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Fonte documental — PNAB Avaliação Pro" },
      {
        name: "description",
        content: "Conexão com a pasta do Google Drive que alimenta os dossiês do edital.",
      },
      { property: "og:title", content: "Fonte documental — PNAB Avaliação Pro" },
      { property: "og:description", content: "Pasta do Drive que alimenta os dossiês do edital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FonteDocumentalRoute,
});

function FonteDocumentalRoute() {
  const search = Route.useSearch();
  return <FonteDocumental search={search} />;
}
