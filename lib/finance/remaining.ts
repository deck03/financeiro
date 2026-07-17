export type SettlementForRemaining = {
  entry_id: string;
  amount: number;
  interest: number;
  penalty: number;
  discount: number;
  addition: number;
  status: string;
};

/**
 * Calcula o saldo restante de um lançamento a partir de suas liquidações.
 *
 * Espelha exatamente a função SQL `entry_remaining_balance` (ver migration
 * 0005_lancamentos_avancados.sql). Usada aqui em lote (várias contas de uma
 * vez, para montar a projeção de caixa) para evitar uma chamada RPC por
 * lançamento. Se a fórmula mudar no banco, deve mudar aqui também.
 */
export function computeRemainingBalance(
  originalAmount: number,
  entryId: string,
  settlements: SettlementForRemaining[]
): number {
  const consumed = settlements
    .filter((s) => s.entry_id === entryId && s.status === "valido")
    .reduce((sum, s) => sum + (s.amount - s.interest - s.penalty - s.addition) + s.discount, 0);

  return originalAmount - consumed;
}
