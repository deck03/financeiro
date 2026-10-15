import "server-only";
import { computeCashflowProjection, addDays } from "@/lib/finance/projection-query";

export type WeeklyReportData = {
  organizationName: string;
  businessBalance: number;
  accountBalances: { name: string; balance: number }[];
  personalBalance: number;
  personalAccountBalances: { name: string; balance: number }[];
  lastReconciliation: {
    doneOn: string; // dia (AAAA-MM-DD, horário de Brasília) em que o último vínculo foi feito
    daysAgo: number;
    statementUpTo: string | null; // data da transação bancária mais recente já conciliada
  } | null;
  availableBalance: number;
  projection15: {
    finalBalance: number;
    minBalance: number;
    minBalanceDate: string;
    negativeDaysCount: number;
    days: { date: string; delta: number; balance: number }[];
  };
  projection7: number;
  projection30: number;
  projection60: number;
  projection90: number;
  entradasProximos7Dias: number;
  saidasProximos7Dias: number;
  overduePayablesCount: number;
  overduePayablesTotal: number;
  overdueReceivablesCount: number;
  overdueReceivablesTotal: number;
  unreconciledCount: number;
  entriesWithoutBankAccount: number;
  balanceDifferences: { accountName: string; difference: number; date: string }[];
  appUrl: string;
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000);
}

export async function buildWeeklyReportData(supabaseAdmin: any, organizationId: string): Promise<WeeklyReportData> {
  const today = new Date();
  const todayISO = toISODate(today);

  const { data: organization } = await supabaseAdmin.from("organizations").select("name").eq("id", organizationId).single();

  const { data: accounts } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, display_name, ownership, consider_in_business_dashboard, consider_in_available_balance")
    .eq("organization_id", organizationId)
    .eq("status", "ativa");

  const businessAccounts = (accounts ?? []).filter((a: any) => a.ownership !== "pessoa_fisica" && a.consider_in_business_dashboard);
  const personalAccounts = (accounts ?? []).filter((a: any) => a.ownership === "pessoa_fisica");
  // Projeções partem do MESMO saldo mostrado como "disponível" no relatório
  // (só contas empresariais marcadas como saldo disponível).
  const businessAccountIds = businessAccounts.filter((a: any) => a.consider_in_available_balance).map((a: any) => a.id);

  const balances = new Map<string, number>();
  await Promise.all(
    (accounts ?? []).map(async (a: any) => {
      const { data } = await supabaseAdmin.rpc("bank_account_balance", { p_account_id: a.id });
      balances.set(a.id, Number(data ?? 0));
    })
  );

  const businessBalance = businessAccounts
    .filter((a: any) => a.consider_in_available_balance)
    .reduce((sum: number, a: any) => sum + (balances.get(a.id) ?? 0), 0);
  const personalBalance = personalAccounts.reduce((sum: number, a: any) => sum + (balances.get(a.id) ?? 0), 0);

  const [p7, p15, p30, p60, p90] = await Promise.all(
    [7, 15, 30, 60, 90].map((days) =>
      computeCashflowProjection(supabaseAdmin, businessAccountIds, todayISO, addDays(todayISO, days), undefined, organizationId)
    )
  );

  const [{ data: payables }, { data: receivables }, unreconciledResult, noBankAccountResult, lastLinkResult, lastStatementResult] = await Promise.all([
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
    supabaseAdmin
      .from("financial_entries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("bank_account_id", null)
      .in("status", ["em_aberto", "agendado"]),
    supabaseAdmin
      .from("reconciliation_links")
      .select("created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("bank_transactions")
      .select("transaction_date")
      .eq("organization_id", organizationId)
      .eq("status", "conciliada")
      .order("transaction_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let lastReconciliation: WeeklyReportData["lastReconciliation"] = null;
  if (lastLinkResult.data?.created_at) {
    const doneOn = new Date(lastLinkResult.data.created_at).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    lastReconciliation = {
      doneOn,
      daysAgo: Math.max(daysBetween(doneOn, todayISO), 0),
      statementUpTo: lastStatementResult.data?.transaction_date ?? null,
    };
  }

  // Evolução dia a dia dos próximos 15 dias (o saldo fica constante nos dias sem movimentação).
  const deltaByDate = new Map<string, number>(p15.projection.checkpoints.map((c: any) => [c.date, c.delta]));
  const balanceByDate = new Map<string, number>(p15.projection.checkpoints.map((c: any) => [c.date, c.balance]));
  const days: WeeklyReportData["projection15"]["days"] = [];
  let runningBalance = p15.currentBalance;
  for (let i = 0; i <= 15; i++) {
    const date = addDays(todayISO, i);
    if (balanceByDate.has(date)) runningBalance = balanceByDate.get(date)!;
    days.push({ date, delta: deltaByDate.get(date) ?? 0, balance: runningBalance });
  }

  const overduePayables = (payables ?? []).filter((e: any) => e.due_date < todayISO);
  const overdueReceivables = (receivables ?? []).filter((e: any) => e.due_date < todayISO);

  const balanceDifferences: WeeklyReportData["balanceDifferences"] = [];
  for (const a of businessAccounts) {
    const { data: snapshot } = await supabaseAdmin
      .from("bank_balance_snapshots")
      .select("informed_balance, calculated_balance, snapshot_date")
      .eq("bank_account_id", a.id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshot) {
      const diff = Number(snapshot.informed_balance) - Number(snapshot.calculated_balance);
      if (Math.abs(diff) > 0.01) {
        balanceDifferences.push({ accountName: a.display_name, difference: diff, date: snapshot.snapshot_date });
      }
    }
  }

  return {
    organizationName: organization?.name ?? "DECK 03",
    businessBalance,
    accountBalances: businessAccounts.map((a: any) => ({ name: a.display_name, balance: balances.get(a.id) ?? 0 })),
    personalBalance,
    personalAccountBalances: personalAccounts.map((a: any) => ({ name: a.display_name, balance: balances.get(a.id) ?? 0 })),
    lastReconciliation,
    availableBalance: p15.currentBalance,
    projection15: {
      finalBalance: p15.projection.finalBalance,
      minBalance: p15.projection.minBalance,
      minBalanceDate: p15.projection.minBalanceDate,
      negativeDaysCount: p15.projection.negativeDaysCount,
      days,
    },
    projection7: p7.projection.finalBalance,
    projection30: p30.projection.finalBalance,
    projection60: p60.projection.finalBalance,
    projection90: p90.projection.finalBalance,
    entradasProximos7Dias: p7.entradasPrevistas,
    saidasProximos7Dias: p7.saidasPrevistas,
    overduePayablesCount: overduePayables.length,
    overduePayablesTotal: overduePayables.reduce((sum: number, e: any) => sum + Number(e.original_amount), 0),
    overdueReceivablesCount: overdueReceivables.length,
    overdueReceivablesTotal: overdueReceivables.reduce((sum: number, e: any) => sum + Number(e.original_amount), 0),
    unreconciledCount: unreconciledResult.count ?? 0,
    entriesWithoutBankAccount: noBankAccountResult.count ?? 0,
    balanceDifferences,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  };
}
