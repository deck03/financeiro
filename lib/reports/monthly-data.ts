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

  const { data: settlements } = await supabaseAdmin
    .from("financial_settlements")
    .select("amount, settlement_date, financial_entries(type, description, chart_account_categories(name))")
    .eq("organization_id", organizationId)
    .eq("status", "valido")
    .gte("settlement_date", periodStartISO)
    .lte("settlement_date", periodEndISO);

  const inflows = (settlements ?? []).filter((s: any) => s.financial_entries?.type === "receita");
  const outflows = (settlements ?? []).filter((s: any) => s.financial_entries?.type === "despesa");

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

  const [{ data: payables }, { data: receivables }, unreconciledResult] = await Promise.all([
    supabaseAdmin
      .from("financial_entries")
      .select("original_amount, status, due_date")
      .eq("organization_id", organizationId)
      .eq("type", "despesa")
      .in("status", ["em_aberto", "agendado", "parcialmente_pago"]),
    supabaseAdmin
      .from("financial_entries")
      .select("original_amount, status, due_date")
      .eq("organization_id", organizationId)
      .eq("type", "receita")
      .in("status", ["em_aberto", "agendado", "parcialmente_recebido"]),
    supabaseAdmin
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "nao_conciliada"),
  ]);

  const todayISO = toISODate(today);
  const overduePayables = (payables ?? []).filter((e: any) => e.due_date < todayISO);
  const overdueReceivables = (receivables ?? []).filter((e: any) => e.due_date < todayISO);
  const payableOpenTotal = (payables ?? []).reduce((sum: number, e: any) => sum + Number(e.original_amount), 0);
  const receivableOpenTotal = (receivables ?? []).reduce((sum: number, e: any) => sum + Number(e.original_amount), 0);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

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
  };
}
