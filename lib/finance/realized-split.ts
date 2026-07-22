/**
 * Separação de sócios/pessoa física no fluxo de caixa realizado.
 *
 * Contexto (ajuste pós-Fase 12): a mesma conta bancária empresarial pode
 * pagar tanto despesas da empresa quanto despesas pessoais dos sócios —
 * não existem necessariamente contas bancárias separadas por titularidade.
 * A DRE já resolve isso corretamente há muito tempo, olhando para
 * `dre_behavior` da categoria (não para a conta usada no pagamento):
 * categorias com dre_behavior = 'nao_incluir' são movimentações de sócios/
 * pessoa física e nunca entram no resultado operacional.
 *
 * Este módulo aplica a MESMA regra ao Fluxo de Caixa Realizado e ao
 * Dashboard, que antes deste ajuste somavam qualquer liquidação da conta
 * como entrada/saída "da empresa", sem checar a categoria — inflando os
 * números quando uma despesa pessoal era paga da conta empresarial.
 *
 * Funções puras — testadas em tests/fase12-fix-socios-fluxo.test.ts.
 */

export type RealizedItem = {
  type: string; // "receita" | "despesa"
  amount: number;
  categoryName: string;
  dreBehavior: string; // 'incluir_operacional' | 'fora_resultado' | 'nao_incluir'
};

/**
 * Separa os itens em "operacionais" (entram nas entradas/saídas do fluxo de
 * caixa empresarial) e "de sócios/pessoa física" (movimentação real da
 * conta, mas que não representa dinheiro da operação do negócio).
 *
 * Note que 'fora_resultado' (financeiras, investimentos) permanece do lado
 * operacional aqui — são gastos/receitas reais da empresa, só não entram no
 * resultado operacional da DRE. O que precisa ficar de fora do fluxo de
 * caixa empresarial é especificamente 'nao_incluir' (sócios/pessoa física).
 */
export function splitRealizedItems<T extends RealizedItem>(items: T[]): { operational: T[]; partners: T[] } {
  const operational: T[] = [];
  const partners: T[] = [];
  for (const item of items) {
    if (item.dreBehavior === "nao_incluir") partners.push(item);
    else operational.push(item);
  }
  return { operational, partners };
}

export type CategoryTotal = { name: string; total: number };

/** Soma por categoria, maior para menor. `limit` corta para exibição em cards. */
export function sumByCategory<T extends { categoryName: string; amount: number }>(
  items: T[],
  limit?: number
): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.categoryName, (totals.get(item.categoryName) ?? 0) + Number(item.amount));
  }
  const sorted = Array.from(totals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
  return limit ? sorted.slice(0, limit) : sorted;
}

/** Total líquido assinado: receitas somam, despesas subtraem — para a linha "Movimentações de sócios". */
export function netSignedTotal(items: Array<{ type: string; amount: number }>): number {
  return items.reduce((sum, item) => sum + (item.type === "receita" ? Number(item.amount) : -Number(item.amount)), 0);
}

/** Soma simples (sem sinal) — para totais de entradas ou de saídas. */
export function sumAmounts(items: Array<{ amount: number }>): number {
  return items.reduce((sum, item) => sum + Number(item.amount), 0);
}
