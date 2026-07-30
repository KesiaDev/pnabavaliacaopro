// Endpoint interno (HMAC) chamado pelo Railway ao concluir o OAuth do Drive
// -- ver src/lib/internal-drive.server.ts.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/drive-connections")({
  beforeLoad: async () => {
    const { handleCreateDriveConnection } = await import("@/lib/internal-drive.server");
    throw await handleCreateDriveConnection();
  },
  component: () => null,
});
