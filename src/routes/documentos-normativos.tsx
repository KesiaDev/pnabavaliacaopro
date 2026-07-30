import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/documentos-normativos")({
  beforeLoad: () => {
    throw redirect({ to: "/editais" as string });
  },
});
