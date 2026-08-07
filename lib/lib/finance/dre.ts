export type DreCategoryLine = {
  key: string;
  label: string;
  total: number;
};

export type DreResult = {
  receitaOperacional: number;
  despesasOperacionaisPorFamilia: DreCategoryLine[];
  despesaOperacionalTotal: number;
  resultadoOperacional: number;
  receitasFinanceiras: number;
  despesasFinanceiras: number;
  resultadoFinanceiro: number;
  outrosResultados: number;
  resultadoAntesInvestimentos: number;
  investimentos: number;
  movimentacoesSocios: DreCategoryLine[];
  movimentacoesSociosTotal: number;
};

type RawItem = {
  type: string;
  amount: number;
  dre_behavior: string;
  managerial_nature: string;
  family_name: string;
};

/**
 * Monta a DRE gerencial a partir de uma lista já classificada de itens
 * (liquidações, no regime de caixa, ou lançamentos, no regime de
 * competência). A classificação usa os campos já existentes no plano de
 * contas desde a Fase 2 — dre_behavior e managerial_nature — como fonte
 * única de verdade, para nunca haver duas regras diferentes decidindo o
 * que é ou não operacional.
 */
export function buildDRE(items: RawItem[]): DreResult {
  let receitaOperacional = 0;
  const despesaPorFamilia = new Map<string, number>();
  let receitasFinanceiras = 0;
  let despesasFinanceiras = 0;
  let outrosResultados = 0;
  let investimentos = 0;
  const movimentacoesSocios = new Map<string, number>();

  for (const item of items) {
    const amount = Number(item.amount);

    if (item.dre_behavior === "incluir_operacional") {
      if (item.type === "receita") {
        receitaOperacional += amount;
      } else {
        despesaPorFamilia.set(item.family_name, (despesaPorFamilia.get(item.family_name) ?? 0) + amount);
      }
      continue;
    }

    if (item.dre_behavior === "fora_resultado") {
      if (item.managerial_nature === "financeira") {
        if (item.type === "receita") receitasFinanceiras += amount;
        else despesasFinanceiras += amount;
      } else if (item.managerial_nature === "investimento") {
        investimentos += amount;
      } else {
        outrosResultados += item.type === "receita" ? amount : -amount;
      }
      continue;
    }

    // dre_behavior === 'nao_incluir' -> movimentações de sócios / pessoa física
    const signedAmount = item.type === "receita" ? amount : -amount;
    movimentacoesSocios.set(item.family_name, (movimentacoesSocios.get(item.family_name) ?? 0) + signedAmount);
  }

  const despesaOperacionalTotal = Array.from(despesaPorFamilia.values()).reduce((a, b) => a + b, 0);
  const resultadoOperacional = receitaOperacional - despesaOperacionalTotal;
  const resultadoFinanceiro = receitasFinanceiras - despesasFinanceiras;
  const resultadoAntesInvestimentos = resultadoOperacional + resultadoFinanceiro + outrosResultados;
  const movimentacoesSociosTotal = Array.from(movimentacoesSocios.values()).reduce((a, b) => a + b, 0);

  return {
    receitaOperacional,
    despesasOperacionaisPorFamilia: Array.from(despesaPorFamilia.entries())
      .map(([label, total]) => ({ key: label, label, total }))
      .sort((a, b) => b.total - a.total),
    despesaOperacionalTotal,
    resultadoOperacional,
    receitasFinanceiras,
    despesasFinanceiras,
    resultadoFinanceiro,
    outrosResultados,
    resultadoAntesInvestimentos,
    investimentos,
    movimentacoesSocios: Array.from(movimentacoesSocios.entries()).map(([label, total]) => ({
      key: label,
      label,
      total,
    })),
    movimentacoesSociosTotal,
  };
}
