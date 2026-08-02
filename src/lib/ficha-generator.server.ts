// Server-only (sufixo .server.ts) — ver aviso em google-oauth.server.ts.
// Preenche o .odt oficial "Edital 119-2026 - Modelo Ficha de Avaliação"
// (fornecido pela SMC) com as notas aprovadas pela avaliadora e a minuta de
// parecer final. Não recria o layout: manipula o arquivo real (zip + XML do
// OpenDocument), preservando cabeçalho, tabelas e formatação originais —
// só os campos em branco (INSCRITO, Pontuação Obtida, parecer, assinatura)
// são preenchidos.
import { unzipSync, zipSync } from "fflate";
import {
  FICHA_EDITAL_119_2026_TEMPLATE_BASE64,
  FICHA_EDITAL_120_2026_TEMPLATE_BASE64,
} from "./ficha-template.server";

const CONTENT_XML = "content.xml";

// Nome fixo: plataforma de uso exclusivo desta avaliadora (Edital 119/2026).
const AVALIADORA_NOME = "Viviane da Rocha Palma";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Localiza a primeira célula de tabela ainda vazia (identificada pelo par de
// estilos célula+parágrafo) e insere o valor. Quando o mesmo par de estilos
// se repete (ex.: uma "Pontuação Obtida" por critério), chamar esta função
// em sequência sempre acerta a próxima célula em branco, porque a que acabou
// de ser preenchida deixa de bater com o padrão "vazio".
function fillCell(xml: string, cellStyle: string, pStyle: string, value: string): string {
  const pattern = `<table:table-cell table:style-name="${cellStyle}" office:value-type="string"><text:p text:style-name="${pStyle}"/></table:table-cell>`;
  const idx = xml.indexOf(pattern);
  if (idx === -1) {
    throw new Error(
      `Modelo da ficha mudou de estrutura: não encontrei a célula ${cellStyle}/${pStyle} vazia. Geração cancelada para não produzir uma ficha incorreta.`,
    );
  }
  const replacement = `<table:table-cell table:style-name="${cellStyle}" office:value-type="string"><text:p text:style-name="${pStyle}">${escapeXml(value)}</text:p></table:table-cell>`;
  return xml.slice(0, idx) + replacement + xml.slice(idx + pattern.length);
}

function setInscrito(xml: string, nome: string): string {
  const pattern =
    '<table:table-cell table:style-name="Tabela4.B1" office:value-type="string"><text:p text:style-name="P6"/></table:table-cell>';
  const idx = xml.indexOf(pattern);
  if (idx === -1) throw new Error("Modelo da ficha mudou: célula INSCRITO não encontrada.");
  const replacement =
    '<table:table-cell table:style-name="Tabela4.B1" office:value-type="string"><text:p text:style-name="P6">' +
    escapeXml(nome) +
    "</text:p></table:table-cell>";
  return xml.slice(0, idx) + replacement + xml.slice(idx + pattern.length);
}

// Substitui o parágrafo inteiro que contém a linha pontilhada reservada ao
// parecer (estilo de texto "T26") por um parágrafo por linha do texto real.
function setParecer(xml: string, paragrafos: string[]): string {
  const marker = '<text:span text:style-name="T26">';
  const markerIdx = xml.indexOf(marker);
  if (markerIdx === -1)
    throw new Error("Modelo da ficha mudou: marcador do parecer não encontrado.");
  const pOpenIdx = xml.lastIndexOf("<text:p ", markerIdx);
  const pCloseIdx = xml.indexOf("</text:p>", markerIdx) + "</text:p>".length;
  if (pOpenIdx === -1 || pCloseIdx === -1) {
    throw new Error("Modelo da ficha mudou: não foi possível delimitar o parágrafo do parecer.");
  }
  const replacement = paragrafos
    .filter((p) => p.trim().length > 0)
    .map((p) => `<text:p text:style-name="P36">${escapeXml(p.trim())}</text:p>`)
    .join("");
  return xml.slice(0, pOpenIdx) + replacement + xml.slice(pCloseIdx);
}

function setSignatureName(xml: string, nome: string): string {
  const marker = '<text:span text:style-name="T28">';
  const startIdx = xml.indexOf(marker);
  if (startIdx === -1)
    throw new Error("Modelo da ficha mudou: linha de assinatura não encontrada.");
  const contentStart = startIdx + marker.length;
  const contentEnd = xml.indexOf("</text:span>", contentStart);
  if (contentEnd === -1) throw new Error("Modelo da ficha mudou: linha de assinatura incompleta.");
  return xml.slice(0, contentStart) + escapeXml(nome) + xml.slice(contentEnd);
}

export type TipoProponente = "pessoa_fisica" | "pessoa_juridica_ou_coletivo";

export interface FichaScores {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
  G: number;
}

export interface BuildFichaParams {
  nomeProponente: string;
  tipoProponente: TipoProponente;
  scores: FichaScores;
  parecerTexto: string;
}

export function buildFichaOdt(params: BuildFichaParams): Buffer {
  const templateBytes = Buffer.from(FICHA_EDITAL_119_2026_TEMPLATE_BASE64, "base64");
  const files = unzipSync(new Uint8Array(templateBytes));

  const contentBytes = files[CONTENT_XML];
  if (!contentBytes)
    throw new Error("Arquivo modelo inválido: content.xml não encontrado no .odt.");

  let xml = new TextDecoder("utf-8").decode(contentBytes);

  xml = setInscrito(xml, params.nomeProponente);

  const mandatorySubtotal =
    params.scores.A + params.scores.B + params.scores.C + params.scores.D + params.scores.E;
  const bonusSubtotal = params.scores.F + params.scores.G;

  // Critérios A–E, nesta ordem — Tabela5.D2 + P14 se repete 5 vezes no molde.
  // Cada fillCell() consome a 1ª célula ainda vazia que casar o padrão: depois
  // de preenchida, ela deixa de bater com o padrão "vazio" e sai da contagem —
  // por isso a ocorrência buscada é sempre 1, nunca um índice fixo crescente.
  const mandatoryOrder: Array<keyof FichaScores> = ["A", "B", "C", "D", "E"];
  for (const criterion of mandatoryOrder) {
    xml = fillCell(xml, "Tabela5.D2", "P14", String(params.scores[criterion]));
  }
  xml = fillCell(xml, "Tabela5.D2", "P7", String(mandatorySubtotal));

  // Só a tabela de bônus correspondente ao tipo de proponente é preenchida —
  // a outra fica em branco, como uma avaliadora humana também deixaria.
  const bonusTable = params.tipoProponente === "pessoa_fisica" ? "Tabela2" : "Tabela3";
  xml = fillCell(xml, `${bonusTable}.D2`, "P29", String(params.scores.F));
  xml = fillCell(xml, `${bonusTable}.D2`, "P29", String(params.scores.G));
  xml = fillCell(xml, `${bonusTable}.D2`, "P31", String(bonusSubtotal));

  const paragrafos = params.parecerTexto.split(/\n{1,}/);
  xml = setParecer(xml, paragrafos);

  xml = setSignatureName(xml, AVALIADORA_NOME);

  const outFiles: Record<
    string,
    Uint8Array | [Uint8Array, { level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }]
  > = {};
  // O mimetype precisa vir primeiro e sem compressão — exigência do formato ODF.
  outFiles["mimetype"] = [files["mimetype"], { level: 0 }];
  for (const [path, bytes] of Object.entries(files)) {
    if (path === "mimetype") continue;
    outFiles[path] = path === CONTENT_XML ? new TextEncoder().encode(xml) : bytes;
  }

  const zipped = zipSync(outFiles);
  return Buffer.from(zipped);
}

// ---------------------------------------------------------------------------
// Edital 120/2026 — molde próprio (10 critérios A-J: A-G obrigatórios,
// H/I/J bônus), diferente do 119 (A-G obrigatórios, F/G bônus). No modelo
// real fornecido pela SMC, cada célula "Pontuação Obtida" já tem um par
// table:style-name/text:style-name ÚNICO no arquivo inteiro (diferente do
// molde do 119, que repete o mesmo par de estilos por linha) — então aqui a
// busca é direta por célula, sem precisar do truque de "primeira vazia"
// usado em fillCell() acima.

export interface FichaScoresEdital120 {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
  G: number;
  H: number;
  I: number;
  J: number;
}

export interface BuildFichaEdital120Params {
  // Ainda não extraímos o título do projeto de nenhum documento do dossiê —
  // fica em branco na ficha até essa extração existir, em vez de adivinhar.
  nomeProjeto: string | null;
  nomeProponente: string;
  tipoProponente: TipoProponente;
  scores: FichaScoresEdital120;
  parecerTexto: string;
}

const CRITERIA_CELL_120: Record<"A" | "B" | "C" | "D" | "E" | "F" | "G", [string, string]> = {
  A: ["TableCell52", "P53"],
  B: ["TableCell64", "P65"],
  C: ["TableCell79", "P80"],
  D: ["TableCell92", "P93"],
  E: ["TableCell104", "P105"],
  F: ["TableCell116", "P117"],
  G: ["TableCell132", "P133"],
};
const MANDATORY_TOTAL_CELL_120: [string, string] = ["TableCell139", "P140"];

// Duas tabelas de bônus distintas no molde (pessoa física / pessoa jurídica
// ou coletivo e grupos sem CNPJ) — só a que corresponde ao tipo do
// proponente é preenchida; a outra fica em branco, como a avaliadora também
// deixaria manualmente.
const BONUS_CELLS_120: Record<
  TipoProponente,
  { H: [string, string]; I: [string, string]; J: [string, string]; total: [string, string] }
> = {
  pessoa_fisica: {
    H: ["TableCell167", "P168"],
    I: ["TableCell176", "P177"],
    J: ["TableCell186", "P187"],
    total: ["TableCell193", "P194"],
  },
  pessoa_juridica_ou_coletivo: {
    H: ["TableCell222", "P223"],
    I: ["TableCell231", "P232"],
    J: ["TableCell240", "P241"],
    total: ["TableCell247", "P248"],
  },
};

// Igual a fillCell(), mas sem o atributo office:value-type="string" -- o
// molde do Edital 120 não o inclui nas células vazias (diferença de como a
// SMC exportou o .odt), então o padrão de busca precisa ser outro.
function setEmptyCell120(xml: string, cellStyle: string, pStyle: string, value: string): string {
  const pattern = `<table:table-cell table:style-name="${cellStyle}"><text:p text:style-name="${pStyle}"/></table:table-cell>`;
  const idx = xml.indexOf(pattern);
  if (idx === -1) {
    throw new Error(
      `Modelo da ficha (Edital 120) mudou de estrutura: não encontrei a célula ${cellStyle}/${pStyle} vazia. Geração cancelada para não produzir uma ficha incorreta.`,
    );
  }
  const replacement = `<table:table-cell table:style-name="${cellStyle}"><text:p text:style-name="${pStyle}">${escapeXml(value)}</text:p></table:table-cell>`;
  return xml.slice(0, idx) + replacement + xml.slice(idx + pattern.length);
}

const PARECER_HEADING_MARKER_120 = "AVALIADOR(A):</text:span></text:p>";
const PARECER_PARAGRAPH_STYLE_120 = "P254";

// O molde do 120 não tem um marcador único de "linha do parecer" como o
// T26 do 119 (uma única linha pontilhada gigante) -- em vez disso reserva um
// bloco de parágrafos em branco entre o título "PARECER DO(A) AVALIADOR(A):"
// e a linha de assinatura (sequência de sublinhados). Localizamos as duas
// bordas do bloco por texto/conteúdo, não por contar quantos parágrafos em
// branco existem, pra não quebrar se a SMC reexportar o modelo com um
// número diferente de linhas reservadas.
function setParecerEdital120(xml: string, paragrafos: string[]): string {
  const headingIdx = xml.indexOf(PARECER_HEADING_MARKER_120);
  if (headingIdx === -1) {
    throw new Error("Modelo da ficha (Edital 120) mudou: cabeçalho do parecer não encontrado.");
  }
  const blockStart = headingIdx + PARECER_HEADING_MARKER_120.length;

  const underscoreMatch = xml
    .slice(blockStart)
    .match(/<text:span text:style-name="[^"]+">_{10,}<\/text:span>/);
  if (!underscoreMatch || underscoreMatch.index === undefined) {
    throw new Error("Modelo da ficha (Edital 120) mudou: linha de assinatura não encontrada.");
  }
  const underscoreSpanIdx = blockStart + underscoreMatch.index;
  const blockEnd = xml.lastIndexOf("<text:p ", underscoreSpanIdx);
  if (blockEnd === -1 || blockEnd < blockStart) {
    throw new Error(
      "Modelo da ficha (Edital 120) mudou: não foi possível delimitar o parágrafo do parecer.",
    );
  }

  const replacement = paragrafos
    .filter((p) => p.trim().length > 0)
    .map(
      (p) =>
        `<text:p text:style-name="${PARECER_PARAGRAPH_STYLE_120}">${escapeXml(p.trim())}</text:p>`,
    )
    .join("");
  return xml.slice(0, blockStart) + replacement + xml.slice(blockEnd);
}

// A linha de assinatura já vem como "________________________________" no
// molde (impressa pra assinar por cima) -- igual ao 119, substituímos esse
// trecho pelo nome da avaliadora, e os rótulos fixos abaixo ("Nome do(a)
// avaliador(a)", "Assinatura") não são tocados.
function setSignatureNameEdital120(xml: string, nome: string): string {
  const match = xml.match(/<text:span text:style-name="([^"]+)">(_{10,})<\/text:span>/);
  if (!match || match.index === undefined) {
    throw new Error("Modelo da ficha (Edital 120) mudou: linha de assinatura não encontrada.");
  }
  const style = match[1];
  const replacement = `<text:span text:style-name="${style}">${escapeXml(nome)}</text:span>`;
  return xml.slice(0, match.index) + replacement + xml.slice(match.index + match[0].length);
}

export function buildFichaOdtEdital120(params: BuildFichaEdital120Params): Buffer {
  const templateBytes = Buffer.from(FICHA_EDITAL_120_2026_TEMPLATE_BASE64, "base64");
  const files = unzipSync(new Uint8Array(templateBytes));

  const contentBytes = files[CONTENT_XML];
  if (!contentBytes)
    throw new Error("Arquivo modelo inválido: content.xml não encontrado no .odt.");

  let xml = new TextDecoder("utf-8").decode(contentBytes);

  if (params.nomeProjeto) {
    xml = setEmptyCell120(xml, "TableCell13", "P14", params.nomeProjeto);
  }
  xml = setEmptyCell120(xml, "TableCell18", "P19", params.nomeProponente);

  const mandatoryOrder: Array<keyof typeof CRITERIA_CELL_120> = ["A", "B", "C", "D", "E", "F", "G"];
  let mandatorySubtotal = 0;
  for (const criterion of mandatoryOrder) {
    const [cellStyle, pStyle] = CRITERIA_CELL_120[criterion];
    xml = setEmptyCell120(xml, cellStyle, pStyle, String(params.scores[criterion]));
    mandatorySubtotal += params.scores[criterion];
  }
  xml = setEmptyCell120(
    xml,
    MANDATORY_TOTAL_CELL_120[0],
    MANDATORY_TOTAL_CELL_120[1],
    String(mandatorySubtotal),
  );

  const bonus = BONUS_CELLS_120[params.tipoProponente];
  const bonusSubtotal = params.scores.H + params.scores.I + params.scores.J;
  xml = setEmptyCell120(xml, bonus.H[0], bonus.H[1], String(params.scores.H));
  xml = setEmptyCell120(xml, bonus.I[0], bonus.I[1], String(params.scores.I));
  xml = setEmptyCell120(xml, bonus.J[0], bonus.J[1], String(params.scores.J));
  xml = setEmptyCell120(xml, bonus.total[0], bonus.total[1], String(bonusSubtotal));

  const paragrafos = params.parecerTexto.split(/\n{1,}/);
  xml = setParecerEdital120(xml, paragrafos);
  xml = setSignatureNameEdital120(xml, AVALIADORA_NOME);

  const outFiles: Record<
    string,
    Uint8Array | [Uint8Array, { level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }]
  > = {};
  outFiles["mimetype"] = [files["mimetype"], { level: 0 }];
  for (const [path, bytes] of Object.entries(files)) {
    if (path === "mimetype") continue;
    outFiles[path] = path === CONTENT_XML ? new TextEncoder().encode(xml) : bytes;
  }

  const zipped = zipSync(outFiles);
  return Buffer.from(zipped);
}
