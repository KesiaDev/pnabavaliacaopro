import { createFileRoute } from "@tanstack/react-router";
import { DocsNormativos } from "@/pages/documentos-normativos";

export const Route = createFileRoute("/editais/$editalId/documentos-normativos")({
  head: () => ({
    meta: [
      { title: "Documentos normativos — PNAB Avaliação Pro" },
      {
        name: "description",
        content: "Versões vigentes do edital, anexos e normas usadas como base da avaliação.",
      },
      { property: "og:title", content: "Documentos normativos — PNAB Avaliação Pro" },
      { property: "og:description", content: "Normas vigentes usadas como base da avaliação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DocsNormativos,
});
