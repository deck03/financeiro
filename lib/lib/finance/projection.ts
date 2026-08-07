export type ProjectionMovement = {
  date: string; // YYYY-MM-DD
  amount: number; // positivo = entrada, negativo = saída
};

export type ProjectionCheckpoint = {
  date: string;
  delta: number;
  balance: number;
};

export type ProjectionResult = {
  finalBalance: number;
  minBalance: number;
  minBalanceDate: string;
  negativeDaysCount: number;
  checkpoints: ProjectionCheckpoint[];
};

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Projeta o saldo de caixa entre "today" e "horizonEnd" (inclusive), a
 * partir do saldo atual e de uma lista de movimentações futuras (valores
 * restantes de lançamentos em aberto/agendados/vencidos, já com data de
 * vencimento no passado "encostada" em hoje pelo chamador).
 *
 * O saldo é tratado como constante entre uma data de movimentação e a
 * próxima — não há mudança de saldo em dias sem lançamento algum.
 */
export function projectCashflow(
  currentBalance: number,
  movements: ProjectionMovement[],
  today: string,
  horizonEnd: string
): ProjectionResult {
  const byDate = new Map<string, number>();
  for (const m of movements) {
    if (m.date < today || m.date > horizonEnd) continue;
    byDate.set(m.date, (byDate.get(m.date) ?? 0) + m.amount);
  }

  const sortedDates = Array.from(byDate.keys()).sort();

  let runningBalance = currentBalance;
  let minBalance = currentBalance;
  let minBalanceDate = today;
  let negativeDaysCount = 0;
  let cursorDate = today;

  const checkpoints: ProjectionCheckpoint[] = [];

  function countNegativeSpan(from: string, toExclusive: string, balance: number) {
    if (balance >= 0) return;
    const span = daysBetween(from, toExclusive);
    negativeDaysCount += Math.max(span, 0);
  }

  for (const date of sortedDates) {
    // dias entre o cursor e esta data mantêm o saldo anterior
    countNegativeSpan(cursorDate, date, runningBalance);

    const delta = byDate.get(date)!;
    runningBalance += delta;
    cursorDate = date;

    checkpoints.push({ date, delta, balance: runningBalance });

    if (runningBalance < minBalance) {
      minBalance = runningBalance;
      minBalanceDate = date;
    }
  }

  // dias entre a última movimentação e o fim do horizonte (inclusive)
  const horizonEndPlusOne = new Date(`${horizonEnd}T00:00:00Z`);
  horizonEndPlusOne.setUTCDate(horizonEndPlusOne.getUTCDate() + 1);
  countNegativeSpan(cursorDate, horizonEndPlusOne.toISOString().slice(0, 10), runningBalance);

  return {
    finalBalance: runningBalance,
    minBalance,
    minBalanceDate,
    negativeDaysCount,
    checkpoints,
  };
}
