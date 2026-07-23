/**
 * Calcula as datas de vencimento de uma série recorrente, com ajuste opcional
 * de dia útil — espelha a lógica de generate_recurring_instances() no banco
 * (corrigida na migration 0012).
 *
 * Ponto central da correção: cada ocorrência é calculada a partir de
 * startDate + (índice × passo), NUNCA a partir da ocorrência anterior já
 * ajustada. Sem isso, um ajuste de fim de semana "gruda" nas ocorrências
 * seguintes e o vencimento deriva mês a mês (ex.: 24 → 26 → 28 → 01 → 03...)
 * em vez de voltar sempre para o dia correto.
 *
 * Função pura — testada em tests/fase12-fix-recorrencia-datas.test.ts.
 */

export type RecurringFrequency = "semanal" | "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";

function addStep(date: Date, frequency: RecurringFrequency, intervalCount: number, times: number): Date {
  const result = new Date(date.getTime());
  switch (frequency) {
    case "semanal":
      result.setUTCDate(result.getUTCDate() + 7 * intervalCount * times);
      break;
    case "mensal":
      result.setUTCMonth(result.getUTCMonth() + intervalCount * times);
      break;
    case "bimestral":
      result.setUTCMonth(result.getUTCMonth() + 2 * intervalCount * times);
      break;
    case "trimestral":
      result.setUTCMonth(result.getUTCMonth() + 3 * intervalCount * times);
      break;
    case "semestral":
      result.setUTCMonth(result.getUTCMonth() + 6 * intervalCount * times);
      break;
    case "anual":
      result.setUTCFullYear(result.getUTCFullYear() + intervalCount * times);
      break;
  }
  return result;
}

function adjustToBusinessDay(date: Date): Date {
  const day = date.getUTCDay(); // 0 = domingo, 6 = sábado
  const result = new Date(date.getTime());
  if (day === 0) result.setUTCDate(result.getUTCDate() + 1);
  else if (day === 6) result.setUTCDate(result.getUTCDate() + 2);
  return result;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Retorna as próximas `count` datas de vencimento de uma recorrência,
 * começando em `startDateIso` (formato YYYY-MM-DD).
 */
export function computeRecurringDueDates(
  startDateIso: string,
  frequency: RecurringFrequency,
  intervalCount: number,
  count: number,
  adjustBusinessDay: boolean
): string[] {
  const start = new Date(`${startDateIso}T00:00:00Z`);
  const dates: string[] = [];
  for (let index = 0; index < count; index++) {
    const base = addStep(start, frequency, intervalCount, index);
    const due = adjustBusinessDay ? adjustToBusinessDay(base) : base;
    dates.push(toISODate(due));
  }
  return dates;
}
