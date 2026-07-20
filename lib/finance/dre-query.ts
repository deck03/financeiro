export type ClassifiedItem = {
  type: string;
  amount: number;
  dre_behavior: string;
  managerial_nature: string;
  family_name: string;
};

export type Regime = "caixa" | "competencia";

/**
 * Busca os itens do período já classificados (tipo, comportamento na DRE,
 * natureza gerencial, família) para alimentar buildDRE(). No regime de
 * caixa, usa as liquidações (financial_settlements); no regime de
 * competência, usa os lançamentos diretamente pela data de competência.
 *
 * @param organizationId use apenas quando chamado fora de uma sessão de
 *   usuário autenticado (cliente admin, sem RLS) — ver mesma observação em
 *   projection-query.ts.
 */
export async function fetchClassifiedItems(
  supabase: any,
  regime: Regime,
  from: string,
  to: string,
  organizationId?: string
): Promise<ClassifiedItem[]> {
  if (regime === "caixa") {
    let query = supabase
      .from("financial_settlements")
      .select(
        "amount, financial_entries(type, chart_account_categories(dre_behavior, managerial_nature, chart_account_families(name)))"
      )
      .eq("status", "valido")
      .gte("settlement_date", from)
      .lte("settlement_date", to);
    if (organizationId) query = query.eq("organization_id", organizationId);
    const { data } = await query;

    return (data ?? [])
      .filter((s: any) => s.financial_entries)
      .map((s: any) => ({
        type: s.financial_entries.type,
        amount: Number(s.amount),
        dre_behavior: s.financial_entries.chart_account_categories?.dre_behavior ?? "nao_incluir",
        managerial_nature: s.financial_entries.chart_account_categories?.managerial_nature ?? "nao_classificada",
        family_name: s.financial_entries.chart_account_categories?.chart_account_families?.name ?? "Sem família",
      }));
  }

  let query = supabase
    .from("financial_entries")
    .select("type, original_amount, chart_account_categories(dre_behavior, managerial_nature, chart_account_families(name))")
    .gte("competence_date", from)
    .lte("competence_date", to)
    .not("status", "in", "(cancelado,estornado)");
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data } = await query;

  return (data ?? []).map((e: any) => ({
    type: e.type,
    amount: Number(e.original_amount),
    dre_behavior: e.chart_account_categories?.dre_behavior ?? "nao_incluir",
    managerial_nature: e.chart_account_categories?.managerial_nature ?? "nao_classificada",
    family_name: e.chart_account_categories?.chart_account_families?.name ?? "Sem família",
  }));
}

/**
 * Transferências classificadas como movimentação de sócio/pessoa física
 * (nunca "transferência interna comum") dentro do período — complementam a
 * seção de movimentações de sócios da DRE, já que uma distribuição de
 * lucros normalmente acontece via transferência entre contas, não via
 * lançamento de despesa.
 */
export async function fetchPartnerTransfers(supabase: any, from: string, to: string, organizationId?: string) {
  let query = supabase
    .from("transfers")
    .select("id, amount, transfer_date, classification, from:from_bank_account_id(display_name), to:to_bank_account_id(display_name)")
    .neq("classification", "transferencia_interna")
    .eq("status", "valido")
    .gte("transfer_date", from)
    .lte("transfer_date", to);
  if (organizationId) query = query.eq("organization_id", organizationId);

  const { data } = await query;
  return data ?? [];
}
