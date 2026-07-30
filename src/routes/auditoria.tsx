import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auditoria")({
  beforeLoad: () => {
    throw redirect({ to: "/editais" as string });
  },
});
