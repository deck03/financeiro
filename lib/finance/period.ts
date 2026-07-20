export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

export function quarterRange(year: number, quarter: number): { from: string; to: string } {
  const startMonth = (quarter - 1) * 3;
  const from = new Date(year, startMonth, 1);
  const to = new Date(year, startMonth + 3, 0);
  return { from: toISODate(from), to: toISODate(to) };
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);
  return { from: toISODate(from), to: toISODate(to) };
}

export function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
