import { createFileRoute } from "@tanstack/react-router";
import { Mudancas } from "@/pages/mudancas";

export const Route = createFileRoute("/editais/$editalId/mudancas")({
  head: () => ({
    meta: [
      { title: "Mudanças — PNAB Avaliação Pro" },
      {
        name: "description",
        content: "Alterações detectadas na fonte documental e ações necessárias no edital.",
      },
      { property: "og:title", content: "Mudanças — PNAB Avaliação Pro" },
      { property: "og:description", content: "Alterações detectadas na fonte documental." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MudancasRoute,
});

function MudancasRoute() {
  const { editalId } = Route.useParams();
  return <Mudancas editalId={editalId} />;
}
