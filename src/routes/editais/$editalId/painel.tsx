import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/pages/painel";

export const Route = createFileRoute("/editais/$editalId/painel")({
  head: () => ({
    meta: [
      { title: "Painel do edital — PNAB Avaliação Pro" },
      {
        name: "description",
        content: "Situação geral do edital: proponentes, pendências humanas e sincronizações.",
      },
      { property: "og:title", content: "Painel do edital — PNAB Avaliação Pro" },
      { property: "og:description", content: "Situação geral do edital em avaliação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});
