/**
 * Formata a data de competência de um lançamento como "Mês/Ano" (ex.:
 * "Julho/2026"), para preencher automaticamente o campo "Referência" do
 * recibo de aluguel. Não usa Intl (o nome do mês por extenso em
 * português deve ser estável independentemente do locale do servidor).
 *
 * Função pura — testada em tests/fase12-fix-recibo.test.ts.
 */

const MONTHS_PT_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatReferencePeriod(competenceDateIso: string | null | undefined): string | null {
  if (!competenceDateIso) return null;
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(competenceDateIso);
  if (!match) return null;
  const [, year, month] = match;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${MONTHS_PT_BR[monthIndex]}/${year}`;
}
