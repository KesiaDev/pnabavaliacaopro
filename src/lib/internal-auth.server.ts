// Server-only. Verifica chamadas do Worker do Railway, que nunca tem sessão
// de usuário pra repassar (roda muito depois da requisição original) e nunca
// deve receber service_role (Lovable Cloud não expõe essa chave). O segredo
// RAILWAY_INTERNAL_SECRET é compartilhado só entre este app e o Railway —
// nunca chega ao navegador.
import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_MS = 5 * 60_000;

export interface InternalAuthResult {
  ok: boolean;
  body?: string;
  errorStatus?: number;
  errorMessage?: string;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function verifyInternalRequest(request: Request): Promise<InternalAuthResult> {
  const secret = process.env.RAILWAY_INTERNAL_SECRET;
  if (!secret) {
    return {
      ok: false,
      errorStatus: 500,
      errorMessage: "RAILWAY_INTERNAL_SECRET não configurado.",
    };
  }

  const timestamp = request.headers.get("x-internal-timestamp");
  const signature = request.headers.get("x-internal-signature");
  if (!timestamp || !signature) {
    return { ok: false, errorStatus: 401, errorMessage: "Assinatura interna ausente." };
  }

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_CLOCK_SKEW_MS) {
    return {
      ok: false,
      errorStatus: 401,
      errorMessage: "Timestamp da assinatura interna expirado.",
    };
  }

  const body = await request.text();
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

  if (!safeEqual(expected, signature)) {
    return { ok: false, errorStatus: 401, errorMessage: "Assinatura interna inválida." };
  }

  return { ok: true, body };
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
