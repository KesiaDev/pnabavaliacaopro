// Endpoint interno (HMAC) chamado pelo Railway ao iniciar uma sincronização
// -- ver src/lib/internal-drive.server.ts.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/sync-runs")({
  beforeLoad: async () => {
    const { handleCreateSyncRun } = await import("@/lib/internal-drive.server");
    throw await handleCreateSyncRun();
  },
  component: () => null,
});
