import { createFileRoute } from "@tanstack/react-router";
import { Auditoria } from "@/pages/auditoria";

export const Route = createFileRoute("/editais/$editalId/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — PNAB Avaliação Pro" },
      {
        name: "description",
        content: "Trilha completa de eventos, decisões e revisões humanas do edital.",
      },
      { property: "og:title", content: "Auditoria — PNAB Avaliação Pro" },
      { property: "og:description", content: "Trilha de eventos e decisões do edital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Auditoria,
});
