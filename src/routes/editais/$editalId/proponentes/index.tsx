import { createFileRoute } from "@tanstack/react-router";
import { ProponentesList } from "@/pages/proponentes-lista";

export const Route = createFileRoute("/editais/$editalId/proponentes/")({
  head: () => ({
    meta: [
      { title: "Proponentes — PNAB Avaliação Pro" },
      {
        name: "description",
        content: "Lista de proponentes do edital com situação de análise e revisão humana.",
      },
      { property: "og:title", content: "Proponentes — PNAB Avaliação Pro" },
      { property: "og:description", content: "Proponentes do edital e situação de análise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProponentesList,
});
