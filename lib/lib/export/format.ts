/**
 * Formatação para exportações (CSV, Excel, PDF).
 *
 * Funções puras, sem dependência de banco — testadas em tests/fase12-export.test.ts.
 * Regras seguem o padrão brasileiro: vírgula decimal, datas DD/MM/AAAA.
 */

export function formatCurrencyBR(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/** Número no padrão brasileiro sem o símbolo R$ (melhor para colunas de planilha). */
export function formatNumberBR(value: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/** Converte "2026-07-21" em "21/07/2026". Datas inválidas/ausentes viram "". */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** Converte um timestamp ISO em "21/07/2026 14:35" (horário local do servidor omitido: usa UTC-3 fixo? Não — mantém UTC explícito). */
export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

/** Nome de arquivo padronizado: deck03-<slug>-AAAA-MM-DD.<ext> */
export function exportFileName(slug: string, extension: string, date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  return `deck03-${slug}-${iso}.${extension}`;
}
