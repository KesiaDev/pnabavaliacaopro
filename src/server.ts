import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// Endpoints internos (HMAC, chamados só pelo Railway) são despachados aqui,
// ANTES de entrar no roteador do TanStack -- o SSR streaming daquele
// roteador serializa o valor de todo beforeLoad/loader via Seroval, que não
// sabe serializar um Response cru (ReadableStream no corpo). Jogar isso
// numa rota React quebrava de forma intermitente conforme a versão do
// @lovable.dev/vite-tanstack-config; interceptar aqui evita o roteador de
// vez, então nunca mais depende desse detalhe de implementação.
async function handleInternalApi(request: Request): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith("/api/internal/")) return null;

  const segments = pathname.split("/").filter(Boolean); // ["api","internal", ...]
  const rest = segments.slice(2); // depois de "api","internal"

  if (rest.length === 1 && rest[0] === "jobs") {
    const { handleCreateJobRequest } = await import("./lib/internal-jobs.server");
    return handleCreateJobRequest(request);
  }
  if (rest.length === 4 && rest[0] === "jobs" && rest[2] === "stages") {
    const { handleUpdateStageRequest } = await import("./lib/internal-jobs.server");
    return handleUpdateStageRequest(request, { jobId: rest[1], stage: rest[3] });
  }
  if (rest.length === 3 && rest[0] === "jobs" && rest[2] === "cancel") {
    const { handleCancelJob } = await import("./lib/internal-jobs.server");
    return handleCancelJob(request, { jobId: rest[1] });
  }
  if (rest.length === 5 && rest[0] === "jobs" && rest[2] === "stages" && rest[4] === "reset") {
    const { handleResetStage } = await import("./lib/internal-jobs.server");
    return handleResetStage(request, { jobId: rest[1], stage: rest[3] });
  }
  if (rest.length === 1 && rest[0] === "drive-connections") {
    const { handleCreateDriveConnection } = await import("./lib/internal-drive.server");
    return handleCreateDriveConnection(request);
  }
  if (rest.length === 1 && rest[0] === "drive-sources") {
    const { handleCreateDriveSource } = await import("./lib/internal-drive.server");
    return handleCreateDriveSource(request);
  }
  if (rest.length === 1 && rest[0] === "sync-runs") {
    const { handleCreateSyncRun } = await import("./lib/internal-drive.server");
    return handleCreateSyncRun(request);
  }
  if (rest.length === 3 && rest[0] === "sync-runs" && rest[2] === "finish") {
    const { handleFinishSyncRun } = await import("./lib/internal-drive.server");
    return handleFinishSyncRun(request, { syncRunId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "sync-runs" && rest[2] === "execute") {
    const { handleExecuteSyncRun } = await import("./lib/internal-drive.server");
    return handleExecuteSyncRun(request, { syncRunId: rest[1] });
  }
  if (rest.length === 2 && rest[0] === "proponents" && rest[1] === "backfill-edital") {
    const { handleBackfillProponentsEdital } = await import("./lib/internal-drive.server");
    return handleBackfillProponentsEdital(request);
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "files") {
    const { handleListProponentFiles } = await import("./lib/internal-documents.server");
    return handleListProponentFiles(request, { proponentId: rest[1] });
  }
  if (rest.length === 1 && rest[0] === "document-pages") {
    const { handleSaveDocumentPages } = await import("./lib/internal-documents.server");
    return handleSaveDocumentPages(request);
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "pages-needing-vision") {
    const { handleListPagesNeedingVision } = await import("./lib/internal-documents.server");
    return handleListPagesNeedingVision(request, { proponentId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "document-pages" && rest[2] === "image") {
    const { handleSaveDocumentPageImage } = await import("./lib/internal-documents.server");
    return handleSaveDocumentPageImage(request, { pageId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "document-pages") {
    const { handleListDocumentPages } = await import("./lib/internal-documents.server");
    return handleListDocumentPages(request, { proponentId: rest[1] });
  }
  if (rest.length === 1 && rest[0] === "document-chunks") {
    const { handleSaveDocumentChunks } = await import("./lib/internal-documents.server");
    return handleSaveDocumentChunks(request);
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "chunks-needing-embedding") {
    const { handleListChunksNeedingEmbedding } = await import("./lib/internal-documents.server");
    return handleListChunksNeedingEmbedding(request, { proponentId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "document-chunks" && rest[2] === "embedding") {
    const { handleSaveChunkEmbedding } = await import("./lib/internal-documents.server");
    return handleSaveChunkEmbedding(request, { chunkId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "editais" && rest[2] === "criteria") {
    const { handleGetEditalCriteria } = await import("./lib/internal-evaluation.server");
    return handleGetEditalCriteria(request, { editalId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "match-chunks") {
    const { handleMatchDocumentChunks } = await import("./lib/internal-evaluation.server");
    return handleMatchDocumentChunks(request, { proponentId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "info") {
    const { handleGetProponentInfo } = await import("./lib/internal-evaluation.server");
    return handleGetProponentInfo(request, { proponentId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "tipo") {
    const { handleSaveTipoProponente } = await import("./lib/internal-evaluation.server");
    return handleSaveTipoProponente(request, { proponentId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "evidence") {
    const { handleSaveEvidence } = await import("./lib/internal-evaluation.server");
    return handleSaveEvidence(request, { proponentId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "criterion-scores") {
    const { handleSaveCriterionScores } = await import("./lib/internal-evaluation.server");
    return handleSaveCriterionScores(request, { proponentId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "flags") {
    const { handleSaveFlag } = await import("./lib/internal-evaluation.server");
    return handleSaveFlag(request, { proponentId: rest[1] });
  }
  if (rest.length === 1 && rest[0] === "cost-entries") {
    const { handleSaveCostEntry } = await import("./lib/internal-evaluation.server");
    return handleSaveCostEntry(request);
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "evaluation-context") {
    const { handleGetEvaluationContext } = await import("./lib/internal-evaluation.server");
    return handleGetEvaluationContext(request, { proponentId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "cycle1-match") {
    const { handleCheckCycle1Match } = await import("./lib/internal-evaluation.server");
    return handleCheckCycle1Match(request, { proponentId: rest[1] });
  }
  if (rest.length === 3 && rest[0] === "proponents" && rest[2] === "parecer") {
    const { handleSaveParecer } = await import("./lib/internal-evaluation.server");
    return handleSaveParecer(request, { proponentId: rest[1] });
  }

  return new Response(
    JSON.stringify({ code: "not_found", message: "Endpoint interno inválido." }),
    {
      status: 404,
      headers: { "content-type": "application/json" },
    },
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const internalResponse = await handleInternalApi(request);
      if (internalResponse) return internalResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
