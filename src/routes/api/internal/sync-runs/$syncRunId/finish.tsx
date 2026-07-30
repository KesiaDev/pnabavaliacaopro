// Endpoint interno (HMAC) chamado pelo Worker do Railway ao concluir (ou
// falhar) uma sincronização -- ver src/lib/internal-drive.server.ts.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/sync-runs/$syncRunId/finish")({
  beforeLoad: async ({ params }) => {
    const { handleFinishSyncRun } = await import("@/lib/internal-drive.server");
    throw await handleFinishSyncRun(params);
  },
  component: () => null,
});
