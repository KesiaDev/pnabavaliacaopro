import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/proponentes/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/editais" as string });
  },
});
