// Server-only (sufixo .server.ts) — ver aviso em google-oauth.server.ts.
// Utilitários compartilhados por todos os agentes: baixar arquivos do
// proponente do bucket privado, e registrar execução em agent_runs/agent_outputs.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AgentFile } from "@/lib/ai-gateway.server";
import { extractText, getDocumentProxy } from "unpdf";

const BUCKET = "dossies-privados";
// Limites do caminho inline (download + base64) — todo arquivo passa por
// aqui, incluindo PDF (ver ai-gateway.server.ts para o porquê). Valores
// calibrados nos mesmos patamares já comprovados em produção (Leonardo, Luiz
// Antonio Rossa) antes de qualquer uma dessas mudanças — 6MB/10MB era
// conservador demais e passou a rejeitar arquivos que sempre funcionaram
// (ex.: um "Documento obrigatorio.pdf" de ~9,5MB). Como agora cada
// agente/critério roda isolado num Worker próprio (não mais 5 agentes
// acumulando memória no mesmo processo), há mais folga que na arquitetura
// original — arquivo grande demais ainda entra como processamento limitado,
// nunca é ignorado em silêncio.
const MAX_DOWNLOAD_FILE_BYTES = 20 * 1024 * 1024;
const MAX_DOWNLOAD_TOTAL_BYTES = 30 * 1024 * 1024;
// PDF entre MAX_DOWNLOAD_FILE_BYTES e este limite: baixado e tem só o TEXTO
// extraído (sem imagens, que são o que normalmente infla o arquivo) — um
// portfólio de 40-100MB pode ter só algumas dezenas de KB de texto de
// verdade. Cada arquivo é processado e liberado antes do próximo (loop
// sequencial), então isso não soma no orçamento de memória do base64 —
// o risco aqui é só o pico transitório de um arquivo por vez.
const MAX_EXTRACT_FILE_BYTES = 80 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_CHARS = 60_000;

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

function bytesFromKb(kb: number | null | undefined): number | null {
  if (typeof kb !== "number" || !Number.isFinite(kb) || kb <= 0) return null;
  return kb * 1024;
}

function limitedFilePlaceholder(fileName: string, reason: string): Buffer {
  return Buffer.from(
    `ARQUIVO NÃO PROCESSADO AUTOMATICAMENTE: ${fileName}\nMotivo: ${reason}\n` +
      "Não use este placeholder como prova de mérito, identidade ou bônus. " +
      "Sinalize revisão humana quando este arquivo puder afetar a avaliação.",
    "utf8",
  );
}

export async function startAgentRun(
  supabase: SupabaseClient<Database>,
  params: { proponentId: string; agentName: string; model: string; triggeredBy: string },
) {
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      proponent_id: params.proponentId,
      agent_name: params.agentName,
      model: params.model,
      prompt_version: "v1",
      triggered_by: params.triggeredBy,
    })
    .select()
    .single();
  if (error || !data)
    throw new Error(`Não foi possível iniciar o agent_run de ${params.agentName}.`);
  return data;
}

export async function finishAgentRun(
  supabase: SupabaseClient<Database>,
  runId: string,
  status: "concluido" | "erro",
  errorMessage?: string,
) {
  await supabase
    .from("agent_runs")
    .update({ status, finished_at: new Date().toISOString(), error_message: errorMessage ?? null })
    .eq("id", runId);
}

export async function recordAgentOutput(
  supabase: SupabaseClient<Database>,
  runId: string,
  outputType: string,
  payload: unknown,
) {
  await supabase
    .from("agent_outputs")
    .insert({ agent_run_id: runId, output_type: outputType, payload: payload as never });
}

export interface ProponentFile {
  id: string;
  versionId: string | null;
  nome: string;
  mimeType: string;
  tipoDocumental: Database["public"]["Enums"]["document_type"] | null;
  data: Buffer;
  tamanhoBytes: number | null;
  processamentoLimitado: boolean;
  observacaoProcessamento: string | null;
}

// Documentos de identidade (identidade/grp/zimbra) só vão para o Agente 3.
// Agentes de mérito (5, 6, 7) nunca recebem esses tipos — Seção 5.6.
export async function fetchProponentFiles(
  supabase: SupabaseClient<Database>,
  proponentId: string,
  tiposPermitidos?: Database["public"]["Enums"]["document_type"][],
): Promise<ProponentFile[]> {
  let query = supabase.from("files").select("*, file_versions(*)").eq("proponent_id", proponentId);
  if (tiposPermitidos) {
    query = query.in("tipo_documental", tiposPermitidos);
  }
  const { data: files, error } = await query;
  if (error || !files) throw new Error("Não foi possível carregar os arquivos do proponente.");

  const result: ProponentFile[] = [];
  let totalDownloadedBytes = 0;
  for (const file of files) {
    const versions = (file.file_versions ?? []) as Array<{
      id: string;
      versao: number;
      storage_path: string;
      tamanho_kb: number | null;
    }>;
    const latest = versions.sort((a, b) => b.versao - a.versao)[0];
    const storagePath = latest?.storage_path ?? file.storage_path;
    const knownSizeBytes = bytesFromKb(latest?.tamanho_kb);
    const mimeType = file.mime_type ?? "application/octet-stream";

    const pushLimited = (reason: string) => {
      result.push({
        id: file.id,
        versionId: latest?.id ?? null,
        nome: file.nome,
        mimeType: "text/plain",
        tipoDocumental: file.tipo_documental,
        data: limitedFilePlaceholder(file.nome, reason),
        tamanhoBytes: knownSizeBytes,
        processamentoLimitado: true,
        observacaoProcessamento: reason,
      });
    };

    const isPdf = mimeType.toLowerCase() === "application/pdf";
    const effectiveMax = isPdf ? MAX_EXTRACT_FILE_BYTES : MAX_DOWNLOAD_FILE_BYTES;

    if (knownSizeBytes && knownSizeBytes > effectiveMax) {
      pushLimited(
        `arquivo com aproximadamente ${Math.ceil(knownSizeBytes / 1024 / 1024)}MB excede o limite seguro de processamento automático`,
      );
      continue;
    }
    // O orçamento total (base64) só se aplica quando o arquivo é pequeno o
    // bastante pra ir embutido — arquivo que vai por extração de texto libera
    // o buffer bruto antes do próximo item do loop, então não acumula aqui.
    if (
      knownSizeBytes &&
      knownSizeBytes <= MAX_DOWNLOAD_FILE_BYTES &&
      totalDownloadedBytes + knownSizeBytes > MAX_DOWNLOAD_TOTAL_BYTES
    ) {
      pushLimited("limite total seguro de documentos inline por chamada atingido");
      continue;
    }

    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(storagePath);
    if (downloadError || !blob) continue;
    const arrayBuffer = await blob.arrayBuffer();
    if (arrayBuffer.byteLength > effectiveMax) {
      pushLimited(
        `arquivo com aproximadamente ${Math.ceil(arrayBuffer.byteLength / 1024 / 1024)}MB excede o limite seguro de processamento automático`,
      );
      continue;
    }

    if (arrayBuffer.byteLength > MAX_DOWNLOAD_FILE_BYTES) {
      // PDF grande demais pra embutir inteiro — extrai só o texto (sem as
      // imagens, que normalmente são o que infla o arquivo) em vez de
      // desistir do documento inteiro.
      const buffer = Buffer.from(arrayBuffer);
      const extracted = await extractPdfText(buffer);
      if (!extracted) {
        pushLimited(
          `arquivo com aproximadamente ${Math.ceil(arrayBuffer.byteLength / 1024 / 1024)}MB não pôde ter texto extraído automaticamente (pode ser digitalização sem camada de texto)`,
        );
        continue;
      }
      const truncated = extracted.length > MAX_EXTRACTED_TEXT_CHARS;
      const text =
        (truncated ? extracted.slice(0, MAX_EXTRACTED_TEXT_CHARS) : extracted) +
        (truncated
          ? "\n\n[TEXTO TRUNCADO — o documento original é maior; isto não é o conteúdo completo.]"
          : "");
      result.push({
        id: file.id,
        versionId: latest?.id ?? null,
        nome: file.nome,
        mimeType: "text/plain",
        tipoDocumental: file.tipo_documental,
        data: Buffer.from(text, "utf8"),
        tamanhoBytes: arrayBuffer.byteLength,
        processamentoLimitado: false,
        observacaoProcessamento: `PDF de ${Math.ceil(arrayBuffer.byteLength / 1024 / 1024)}MB — apenas o texto extraído foi enviado ao agente, sem imagens.`,
      });
      continue;
    }

    const buffer = Buffer.from(arrayBuffer);
    totalDownloadedBytes += buffer.length;
    result.push({
      id: file.id,
      versionId: latest?.id ?? null,
      nome: file.nome,
      mimeType,
      tipoDocumental: file.tipo_documental,
      data: buffer,
      tamanhoBytes: arrayBuffer.byteLength,
      processamentoLimitado: false,
      observacaoProcessamento: null,
    });
  }
  return result;
}

export function toAgentFiles(files: ProponentFile[]): AgentFile[] {
  return files.map((f) => ({ name: f.nome, mimeType: f.mimeType, data: f.data }));
}

export function findFileByName(files: ProponentFile[], nome: string): ProponentFile | undefined {
  const normalized = nome.trim().toLowerCase();
  return files.find((f) => f.nome.trim().toLowerCase() === normalized);
}

export function getLimitedProcessingFiles(files: ProponentFile[]): ProponentFile[] {
  return files.filter((file) => file.processamentoLimitado);
}

export function describeLimitedProcessing(files: ProponentFile[]): string {
  const limited = getLimitedProcessingFiles(files);
  if (limited.length === 0) return "";
  return `Arquivos não analisados automaticamente por limite técnico: ${limited
    .map(
      (file) =>
        `${file.nome}${file.observacaoProcessamento ? ` (${file.observacaoProcessamento})` : ""}`,
    )
    .join("; ")}`;
}

// Tipos de documento liberados para os agentes de mérito (nunca identidade/grp/zimbra).
export const TIPOS_MERITO: Database["public"]["Enums"]["document_type"][] = [
  "formulario",
  "portfolio",
  "comprobatorio",
  "outro",
];

// Seção 2.2: links informados pelo proponente podem ser consultados, desde que
// o sistema registre URL, data/hora do acesso e o que foi analisado. Isto só
// confirma que o link resolve e captura o título da página — nunca afirma ter
// "assistido" vídeo ou verificado o conteúdo em si, só a existência do link.
export interface LinkCheckResult {
  url: string;
  acessadoEm: string;
  status: number | null;
  titulo: string | null;
  acessivel: boolean;
}

export async function checkUrl(url: string): Promise<LinkCheckResult> {
  const acessadoEm = new Date().toISOString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PNABAvaliacaoBot/1.0)" },
    });
    clearTimeout(timeout);
    let titulo: string | null = null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      const text = await res.text();
      const match = text.match(/<title[^>]*>([^<]*)<\/title>/i);
      titulo = match ? match[1].trim().slice(0, 200) : null;
    }
    return { url, acessadoEm, status: res.status, titulo, acessivel: res.ok };
  } catch {
    return { url, acessadoEm, status: null, titulo: null, acessivel: false };
  }
}

export function describeLinkCheck(check: LinkCheckResult): string {
  if (check.status == null) {
    return `Link informado pelo proponente: ${check.url} — não foi possível acessar automaticamente em ${check.acessadoEm} (verificar manualmente).`;
  }
  const tituloTxt = check.titulo ? ` Título da página: "${check.titulo}".` : "";
  return `Link informado pelo proponente: ${check.url} — acessado em ${check.acessadoEm}, status HTTP ${check.status} (${check.acessivel ? "acessível" : "inacessível"}).${tituloTxt} Conteúdo do link (ex.: vídeo) não foi assistido/verificado pelo agente — apenas a existência do link foi confirmada.`;
}
