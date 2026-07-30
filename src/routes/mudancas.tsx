import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mudancas")({
  beforeLoad: () => {
    throw redirect({ to: "/editais" as string });
  },
});
