import { createFileRoute, useParams } from "@tanstack/react-router";
import { ProponentDetail } from "@/pages/proponente-detalhe";

export const Route = createFileRoute("/editais/$editalId/proponentes/$applicationId")({
  head: () => ({
    meta: [
      { title: "Dossiê do proponente — PNAB Avaliação Pro" },
      {
        name: "description",
        content:
          "Matriz de evidências, critérios, pareceres e revisão humana obrigatória do proponente.",
      },
      { property: "og:title", content: "Dossiê do proponente — PNAB Avaliação Pro" },
      {
        property: "og:description",
        content: "Evidências, critérios e revisão humana do proponente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProponentDetailRoute,
});

function ProponentDetailRoute() {
  const { applicationId } = useParams({
    from: "/editais/$editalId/proponentes/$applicationId",
  });
  return <ProponentDetail id={applicationId} />;
}
