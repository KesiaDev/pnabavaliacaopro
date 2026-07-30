// Endpoint interno chamado só pelo Railway (API), nunca pelo navegador.
// Autenticado por HMAC — ver src/lib/internal-jobs.server.ts.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/jobs")({
  beforeLoad: async () => {
    const { handleCreateJobRequest } = await import("@/lib/internal-jobs.server");
    throw await handleCreateJobRequest();
  },
  component: () => null,
});
