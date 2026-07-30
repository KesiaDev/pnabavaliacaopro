import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/editais/$editalId/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: `/editais/${params.editalId}/painel` as string });
  },
});
