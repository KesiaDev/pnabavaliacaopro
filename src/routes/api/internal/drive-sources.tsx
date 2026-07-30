// Endpoint interno (HMAC) chamado pelo Railway ao salvar a pasta-fonte de um
// edital -- ver src/lib/internal-drive.server.ts.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/drive-sources")({
  beforeLoad: async () => {
    const { handleCreateDriveSource } = await import("@/lib/internal-drive.server");
    throw await handleCreateDriveSource();
  },
  component: () => null,
});
