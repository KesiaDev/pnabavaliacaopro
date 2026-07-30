// Endpoint interno (HMAC) chamado pelo Worker do Railway pra gravar o
// resultado de uma etapa — ver src/lib/internal-jobs.server.ts.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/jobs/$jobId/stages/$stage")({
  beforeLoad: async ({ params }) => {
    const { handleUpdateStageRequest } = await import("@/lib/internal-jobs.server");
    throw await handleUpdateStageRequest(params);
  },
  component: () => null,
});
