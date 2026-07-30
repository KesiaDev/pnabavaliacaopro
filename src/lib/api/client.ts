import { supabase } from "@/integrations/supabase/client";
import { ApiError } from "./errors";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "");

export function isApiConfigured(): boolean {
  return Boolean(BASE_URL);
}

export const APP_ENV = (import.meta.env.VITE_APP_ENV as string | undefined) ?? "development";

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// Interceptor: injeta o access token do Supabase em toda chamada, renova a
// sessão uma vez em caso de 401 e só então propaga a falha de autenticação.
async function getAccessToken(forceRefresh = false): Promise<string | null> {
  if (forceRefresh) {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** Resposta binária (exportações) */
  blob?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function toApiError(response: Response): Promise<ApiError> {
  let payload: Record<string, unknown> = {};
  try {
    const text = await response.text();
    if (text) payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // corpo não-JSON: mantemos o payload vazio e caímos no texto padrão
  }
  const message =
    (typeof payload.message === "string" && payload.message) ||
    (typeof payload.error === "string" && payload.error) ||
    `O serviço respondeu ${response.status} (${response.statusText || "sem descrição"}).`;

  return new ApiError({
    status: response.status,
    code: typeof payload.code === "string" ? payload.code : `HTTP_${response.status}`,
    message,
    stage: typeof payload.stage === "string" ? payload.stage : undefined,
    retryable:
      typeof payload.retryable === "boolean" ? payload.retryable : response.status >= 500,
    preserved: typeof payload.preserved === "boolean" ? payload.preserved : true,
    details: payload.details,
  });
}

async function rawRequest<T>(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!response.ok) return { ok: false, response };

  if (options.blob) {
    return { ok: true, data: (await response.blob()) as unknown as T };
  }
  if (response.status === 204) return { ok: true, data: undefined as T };
  const text = await response.text();
  return { ok: true, data: (text ? JSON.parse(text) : undefined) as T };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!BASE_URL) throw ApiError.notConfigured();

  let token = await getAccessToken();

  let result: Awaited<ReturnType<typeof rawRequest<T>>>;
  try {
    result = await rawRequest<T>(path, options, token);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw ApiError.network(err instanceof Error ? err.message : "");
  }

  // 401: tenta renovar a sessão uma única vez antes de desistir.
  if (!result.ok && result.response.status === 401) {
    token = await getAccessToken(true);
    if (token) {
      try {
        result = await rawRequest<T>(path, options, token);
      } catch (err) {
        throw ApiError.network(err instanceof Error ? err.message : "");
      }
    }
    if (!result.ok && result.response.status === 401) {
      onUnauthorized?.();
      throw new ApiError({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Sua sessão expirou. Entre novamente para continuar.",
        retryable: false,
        preserved: true,
      });
    }
  }

  if (!result.ok) throw await toApiError(result.response);
  return result.data;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "GET", query, signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
  postBlob: (path: string, body?: unknown) =>
    apiRequest<Blob>(path, { method: "POST", body, blob: true }),
};
