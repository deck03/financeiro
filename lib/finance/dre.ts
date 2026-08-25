export type DreCategoryLine = {
  key: string;
  label: string;
  total: number;
};

/** Nó da árvore consolidada (família → categoria → subcategoria). O total é sempre positivo — quem exibe decide o sinal. */
export type DreTreeNode = {
  key: string;
  label: string;
  total: number;
  children: DreTreeNode[];
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
  // Visão consolidada (família → categoria → subcategoria), adicionada
  // para a DRE detalhada — os campos acima continuam exatamente iguais,
  // para não quebrar a exportação (CSV/PDF) nem nada que já lê DreResult.
  receitaOperacionalTree: DreTreeNode[];
  despesasOperacionaisTree: DreTreeNode[];
};

type RawItem = {
  type: string;
  amount: number;
  dre_behavior: string;
  managerial_nature: string;
  family_name: string;
  category_name?: string;
  subcategory_name?: string | null;
};

const SEM_SUBCATEGORIA = "__sem_subcategoria__";

type TreeAccumulator = Map<
  string,
  { total: number; categories: Map<string, { total: number; subcategories: Map<string, number> }> }
>;

function addToTree(acc: TreeAccumulator, family: string, category: string, subcategory: string | null, amount: number) {
  if (!acc.has(family)) acc.set(family, { total: 0, categories: new Map() });
  const fam = acc.get(family)!;
  fam.total += amount;

  if (!fam.categories.has(category)) fam.categories.set(category, { total: 0, subcategories: new Map() });
  const cat = fam.categories.get(category)!;
  cat.total += amount;

  const subKey = subcategory ?? SEM_SUBCATEGORIA;
  cat.subcategories.set(subKey, (cat.subcategories.get(subKey) ?? 0) + amount);
}

function treeToNodes(acc: TreeAccumulator): DreTreeNode[] {
  return Array.from(acc.entries())
    .map(([familyLabel, fam]) => ({
      key: familyLabel,
      label: familyLabel,
      total: fam.total,
      children: Array.from(fam.categories.entries())
        .map(([categoryLabel, cat]) => {
          const subEntries = Array.from(cat.subcategories.entries());
          // Se a categoria só tem itens sem subcategoria, não vale a pena
          // abrir mais um nível repetindo o mesmo total — deixa a
          // categoria como o nível mais detalhado nesse caso.
          const onlyUnclassified = subEntries.length === 1 && subEntries[0][0] === SEM_SUBCATEGORIA;
          const children: DreTreeNode[] = onlyUnclassified
            ? []
            : subEntries
                .map(([subLabel, subTotal]) => ({
                  key: `${familyLabel}__${categoryLabel}__${subLabel}`,
                  label: subLabel === SEM_SUBCATEGORIA ? "(sem subcategoria)" : subLabel,
                  total: subTotal,
                  children: [] as DreTreeNode[],
                }))
                .sort((a, b) => b.total - a.total);
          return {
            key: `${familyLabel}__${categoryLabel}`,
            label: categoryLabel,
            total: cat.total,
            children,
          };
        })
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);
}

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

  const receitaOperacionalAcc: TreeAccumulator = new Map();
  const despesaOperacionalAcc: TreeAccumulator = new Map();

  for (const item of items) {
    const amount = Number(item.amount);
    const categoryName = item.category_name ?? "Sem categoria";
    const subcategoryName = item.subcategory_name ?? null;

    if (item.dre_behavior === "incluir_operacional") {
      if (item.type === "receita") {
        receitaOperacional += amount;
        addToTree(receitaOperacionalAcc, item.family_name, categoryName, subcategoryName, amount);
      } else {
        despesaPorFamilia.set(item.family_name, (despesaPorFamilia.get(item.family_name) ?? 0) + amount);
        addToTree(despesaOperacionalAcc, item.family_name, categoryName, subcategoryName, amount);
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
    receitaOperacionalTree: treeToNodes(receitaOperacionalAcc),
    despesasOperacionaisTree: treeToNodes(despesaOperacionalAcc),
  };
}
