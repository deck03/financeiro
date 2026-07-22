/**
 * Geração de CSV para exportações.
 *
 * Decisões (importantes para abrir direto no Excel em português):
 * - Separador ";" — o Excel pt-BR usa vírgula como decimal, então o
 *   separador de colunas precisa ser ponto e vírgula.
 * - BOM UTF-8 no início — sem ele, o Excel no Windows exibe acentos errados.
 * - Quebra de linha CRLF — padrão esperado pelo Excel.
 * - Escapamento conforme RFC 4180: valores com ";", aspas ou quebras de
 *   linha são envolvidos em aspas duplas, e aspas internas são duplicadas.
 *
 * Funções puras — testadas em tests/fase12-export.test.ts.
 */

export const CSV_SEPARATOR = ";";
export const CSV_BOM = "\uFEFF";

export function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes(CSV_SEPARATOR) || text.includes('"') || text.includes("\n") || text.includes("\r")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map(escapeCsvValue).join(CSV_SEPARATOR)];
  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(CSV_SEPARATOR));
  }
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}
