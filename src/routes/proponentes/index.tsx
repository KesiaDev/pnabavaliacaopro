import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/proponentes/")({
  beforeLoad: () => {
    throw redirect({ to: "/editais" as string });
  },
});
