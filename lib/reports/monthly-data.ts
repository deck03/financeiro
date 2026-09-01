import "server-only";
import { buildDRE } from "@/lib/finance/dre";
import { fetchClassifiedItems } from "@/lib/finance/dre-query";
import { computeCashflowProjection, addDays } from "@/lib/finance/projection-query";

export type MonthlyReportData = {
  organizationName: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  initialBalance: number;
  finalBalance: number;
  cashGenerated: number;
  // A partir desta correção, totalInflows/totalOutflows e tudo que deriva
  // deles (top 5, agrupamento por categoria) representam só PJ — pessoa
  // física (dre_behavior = 'nao_incluir', mesma classificação já usada na
  // DRE e no Fluxo de Caixa Realizado) fica de fora, igual já acontecia
  // com operatingRevenue/operatingResult. Os totais de PF entram
  // separados, nos campos pf* abaixo — nunca mais misturados.
  totalInflows: number;
  totalOutflows: number;
  operatingRevenue: number;
  operatingResult: number;
  payableOpenTotal: number;
  receivableOpenTotal: number;
  overduePayablesTotal: number;
  overdueReceivablesTotal: number;
  overdueReceivablesCount: number;
  totalReceivableEverOpen: number;
  projectedBalance30: number;
  previousMonthRevenue: number;
  previousMonthExpense: number;
  topInflows: { description: string; amount: number }[];
  topOutflows: { description: string; amount: number }[];
  expensesByCategory: { name: string; total: number }[];
  revenueByCategory: { name: string; total: number }[];
  unreconciledCount: number;
  appUrl: string;
  // Movimentações de sócios / pessoa física do período — separadas de
  // tudo acima, nunca somadas aos números de PJ.
  pfInflowsTotal: number;
  pfOutflowsTotal: number;
  pfNetTotal: number;
  pfPayableOpenTotal: number;
  pfReceivableOpenTotal: number;
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function buildMonthlyReportData(supabaseAdmin: any, organizationId: string): Promise<MonthlyReportData> {
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const periodEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const periodStartISO = toISODate(periodStart);
  const periodEndISO = toISODate(periodEnd);

  const prevPeriodStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const prevPeriodEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);

  const { data: organization } = await supabaseAdmin.from("organizations").select("name").eq("id", organizationId).single();

  const { data: accounts } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, ownership, consider_in_business_dashboard, consider_in_available_balance")
    .eq("organization_id", organizationId)
    .eq("status", "ativa");

  const businessAccounts = (accounts ?? []).filter(
    (a: any) => a.ownership !== "pessoa_fisica" && a.consider_in_business_dashboard && a.consider_in_available_balance
  );
  const businessAccountIds = businessAccounts.map((a: any) => a.id);

  const [initialBalances, finalBalances] = await Promise.all([
    Promise.all(businessAccountIds.map((id: string) => supabaseAdmin.rpc("bank_account_balance_at", { p_account_id: id, p_as_of: addDays(periodStartISO, -1) }))),
    Promise.all(businessAccountIds.map((id: string) => supabaseAdmin.rpc("bank_account_balance_at", { p_account_id: id, p_as_of: periodEndISO }))),
  ]);
  const initialBalance = initialBalances.reduce((sum: number, r: any) => sum + Number(r.data ?? 0), 0);
  const finalBalance = finalBalances.reduce((sum: number, r: any) => sum + Number(r.data ?? 0), 0);

  const items = await fetchClassifiedItems(supabaseAdmin, "caixa", periodStartISO, periodEndISO, organizationId);
  const dre = buildDRE(items);

  const prevItems = await fetchClassifiedItems(
    supabaseAdmin,
    "caixa",
    toISODate(prevPeriodStart),
    toISODate(prevPeriodEnd),
    organizationId
  );
  const prevDre = buildDRE(prevItems);

  // dre_behavior entra na busca para separar PF de PJ — mesma
  // classificação já usada na DRE e no Fluxo de Caixa Realizado
  // ('nao_incluir' = movimentação de sócio/pessoa física, nunca somada
  // aos números operacionais de PJ).
  const { data: settlements } = await supabaseAdmin
    .from("financial_settlements")
    .select("amount, settlement_date, financial_entries(type, description, chart_account_categories(name, dre_behavior))")
    .eq("organization_id", organizationId)
    .eq("status", "valido")
    .gte("settlement_date", periodStartISO)
    .lte("settlement_date", periodEndISO);

  function isPF(s: any) {
    return s.financial_entries?.chart_account_categories?.dre_behavior === "nao_incluir";
  }

  const allInflows = (settlements ?? []).filter((s: any) => s.financial_entries?.type === "receita");
  const allOutflows = (settlements ?? []).filter((s: any) => s.financial_entries?.type === "despesa");

  const inflows = allInflows.filter((s: any) => !isPF(s));
  const outflows = allOutflows.filter((s: any) => !isPF(s));
  const pfInflows = allInflows.filter(isPF);
  const pfOutflows = allOutflows.filter(isPF);

  function groupByCategory(list: any[]) {
    const map = new Map<string, number>();
    for (const s of list) {
      const name = s.financial_entries?.chart_account_categories?.name ?? "Sem categoria";
      map.set(name, (map.get(name) ?? 0) + Number(s.amount));
    }
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }

  const topInflows = [...inflows]
    .sort((a: any, b: any) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((s: any) => ({ description: s.financial_entries?.description ?? "", amount: Number(s.amount) }));
  const topOutflows = [...outflows]
    .sort((a: any, b: any) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((s: any) => ({ description: s.financial_entries?.description ?? "", amount: Number(s.amount) }));

  const projection30 = await computeCashflowProjection(
    supabaseAdmin,
    businessAccountIds,
    toISODate(today),
    addDays(toISODate(today), 30),
    undefined,
    organizationId
  );

  // dre_behavior também entra aqui, pelo mesmo motivo — separar o que
  // ainda está em aberto de PJ do que é PF.
  const [{ data: payables }, { data: receivables }, unreconciledResult] = await Promise.all([
    supabaseAdmin
      .from("financial_entries")
      .select("original_amount, status, due_date, chart_account_categories(dre_behavior)")
      .eq("organization_id", organizationId)
      .eq("type", "despesa")
      .in("status", ["em_aberto", "agendado", "parcialmente_pago"]),
    supabaseAdmin
      .from("financial_entries")
      .select("original_amount, status, due_date, chart_account_categories(dre_behavior)")
      .eq("organization_id", organizationId)
      .eq("type", "receita")
      .in("status", ["em_aberto", "agendado", "parcialmente_recebido"]),
    supabaseAdmin
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "nao_conciliada"),
  ]);

  function isPFEntry(e: any) {
    return e.chart_account_categories?.dre_behavior === "nao_incluir";
  }

  const pjPayables = (payables ?? []).filter((e: any) => !isPFEntry(e));
  const pjReceivables = (receivables ?? []).filter((e: any) => !isPFEntry(e));
  const pfPayables = (payables ?? []).filter(isPFEntry);
  const pfReceivables = (receivables ?? []).filter(isPFEntry);

  const todayISO = toISODate(today);
  // Vencidos continuam olhando só PJ — o mesmo raciocínio de "separar 100%"
  // vale aqui: uma pendência de PF não deveria aparecer misturada no
  // alerta de vencidos do negócio.
  const overduePayables = pjPayables.filter((e: any) => e.due_date < todayISO);
  const overdueReceivables = pjReceivables.filter((e: any) => e.due_date < todayISO);
  const payableOpenTotal = pjPayables.reduce((sum: number, e: any) => sum + Number(e.original_amount), 0);
  const receivableOpenTotal = pjReceivables.reduce((sum: number, e: any) => sum + Number(e.original_amount), 0);
  const pfPayableOpenTotal = pfPayables.reduce((sum: number, e: any) => sum + Number(e.original_amount), 0);
  const pfReceivableOpenTotal = pfReceivables.reduce((sum: number, e: any) => sum + Number(e.original_amount), 0);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const pfInflowsTotal = pfInflows.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  const pfOutflowsTotal = pfOutflows.reduce((sum: number, s: any) => sum + Number(s.amount), 0);

  return {
    organizationName: organization?.name ?? "DECK 03",
    periodLabel: `${monthNames[periodStart.getMonth()]} de ${periodStart.getFullYear()}`,
    periodStart: periodStartISO,
    periodEnd: periodEndISO,
    initialBalance,
    finalBalance,
    cashGenerated: finalBalance - initialBalance,
    totalInflows: inflows.reduce((sum: number, s: any) => sum + Number(s.amount), 0),
    totalOutflows: outflows.reduce((sum: number, s: any) => sum + Number(s.amount), 0),
    operatingRevenue: dre.receitaOperacional,
    operatingResult: dre.resultadoOperacional,
    payableOpenTotal,
    receivableOpenTotal,
    overduePayablesTotal: overduePayables.reduce((sum: number, e: any) => sum + Number(e.original_amount), 0),
    overdueReceivablesTotal: overdueReceivables.reduce((sum: number, e: any) => sum + Number(e.original_amount), 0),
    overdueReceivablesCount: overdueReceivables.length,
    totalReceivableEverOpen: receivableOpenTotal,
    projectedBalance30: projection30.projection.finalBalance,
    previousMonthRevenue: prevDre.receitaOperacional,
    previousMonthExpense: prevDre.despesaOperacionalTotal,
    topInflows,
    topOutflows,
    expensesByCategory: groupByCategory(outflows),
    revenueByCategory: groupByCategory(inflows),
    unreconciledCount: unreconciledResult.count ?? 0,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
    pfInflowsTotal,
    pfOutflowsTotal,
    pfNetTotal: pfInflowsTotal - pfOutflowsTotal,
    pfPayableOpenTotal,
    pfReceivableOpenTotal,
  };
}
