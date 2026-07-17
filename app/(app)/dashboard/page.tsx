import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AlertItem } from "@/components/dashboard/alert-item";
import { computeCashflowProjection, addDays } from "@/lib/finance/projection-query";
import Link from "next/link";

const OPEN_STATUSES_PAYABLE = ["em_aberto", "agendado", "parcialmente_pago"];
const OPEN_STATUSES_RECEIVABLE = ["em_aberto", "agendado", "parcialmente_recebido"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function firstOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastOfPreviousMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 0);
}

function firstOfPreviousMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role_key, organization_id")
    .eq("id", user!.id)
    .single();

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile?.organization_id ?? "")
    .single();

  const canViewDashboard = await hasPermission("visualizar_dashboard");

  if (!canViewDashboard) {
    return (
      <Card>
        <p className="text-sm text-ink-soft">Você não tem permissão para visualizar o dashboard.</p>
      </Card>
    );
  }

  const canSeeBalances = await hasPermission("visualizar_saldos");
  const canSeePersonal = await hasPermission("visualizar_contas_pessoais");
  const canSeeEntries = await hasPermission("visualizar_lancamentos");

  const today = new Date();
  const todayISO = toISODate(today);
  const monthStartISO = toISODate(firstOfMonth(today));
  const prevMonthStartISO = toISODate(firstOfPreviousMonth(today));
  const prevMonthEndISO = toISODate(lastOfPreviousMonth(today));

  // --------------------------------------------------------------------
  // Contas e saldos
  // --------------------------------------------------------------------
  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, display_name, ownership, minimum_balance, consider_in_available_balance, consider_in_business_dashboard")
    .eq("status", "ativa");

  const businessAccounts = (accounts ?? []).filter((a) => a.ownership !== "pessoa_fisica" && a.consider_in_business_dashboard);
  const personalAccounts = (accounts ?? []).filter((a) => a.ownership === "pessoa_fisica");
  const businessAccountIds = businessAccounts.map((a) => a.id);

  const accountBalances = new Map<string, number>();
  if (canSeeBalances) {
    const results = await Promise.all(
      (accounts ?? []).map(async (a) => {
        const { data } = await supabase.rpc("bank_account_balance", { p_account_id: a.id });
        return [a.id, Number(data ?? 0)] as const;
      })
    );
    for (const [id, balance] of results) accountBalances.set(id, balance);
  }

  const businessAvailableTotal = businessAccounts
    .filter((a) => a.consider_in_available_balance)
    .reduce((sum, a) => sum + (accountBalances.get(a.id) ?? 0), 0);
  const personalTotal = personalAccounts.reduce((sum, a) => sum + (accountBalances.get(a.id) ?? 0), 0);

  // Geração/consumo de caixa no mês: saldo empresarial agora vs no início do mês
  let cashGeneratedThisMonth = 0;
  if (canSeeBalances && businessAccountIds.length > 0) {
    const startResults = await Promise.all(
      businessAccountIds.map((id) =>
        supabase.rpc("bank_account_balance_at", { p_account_id: id, p_as_of: addDays(monthStartISO, -1) })
      )
    );
    const startTotal = startResults.reduce((sum, r) => sum + Number(r.data ?? 0), 0);
    cashGeneratedThisMonth = businessAvailableTotal - startTotal;
  }

  // --------------------------------------------------------------------
  // Caixa projetado (7 / 30 / 90 dias) — mesma lógica do Fluxo de Caixa Projetado
  // --------------------------------------------------------------------
  let projection30: Awaited<ReturnType<typeof computeCashflowProjection>> | null = null;
  let projection7Final = 0;
  let projection90Final = 0;

  if (canSeeBalances && businessAccountIds.length > 0) {
    const [p7, p30, p90] = await Promise.all([
      computeCashflowProjection(supabase, businessAccountIds, todayISO, addDays(todayISO, 7)),
      computeCashflowProjection(supabase, businessAccountIds, todayISO, addDays(todayISO, 30)),
      computeCashflowProjection(supabase, businessAccountIds, todayISO, addDays(todayISO, 90)),
    ]);
    projection30 = p30;
    projection7Final = p7.projection.finalBalance;
    projection90Final = p90.projection.finalBalance;
  }

  // --------------------------------------------------------------------
  // Contas a pagar / a receber
  // --------------------------------------------------------------------
  let payableOpenTotal = 0;
  let payableOverdueTotal = 0;
  let payableOverdueCount = 0;
  let receivableOpenTotal = 0;
  let receivableOverdueTotal = 0;
  let receivableOverdueCount = 0;

  if (canSeeEntries) {
    const [{ data: payables }, { data: receivables }] = await Promise.all([
      supabase.from("financial_entries").select("original_amount, status, due_date").eq("type", "despesa"),
      supabase.from("financial_entries").select("original_amount, status, due_date").eq("type", "receita"),
    ]);

    payableOpenTotal = (payables ?? [])
      .filter((e) => OPEN_STATUSES_PAYABLE.includes(e.status))
      .reduce((sum, e) => sum + Number(e.original_amount), 0);
    const overduePayables = (payables ?? []).filter((e) => OPEN_STATUSES_PAYABLE.includes(e.status) && e.due_date < todayISO);
    payableOverdueTotal = overduePayables.reduce((sum, e) => sum + Number(e.original_amount), 0);
    payableOverdueCount = overduePayables.length;

    receivableOpenTotal = (receivables ?? [])
      .filter((e) => OPEN_STATUSES_RECEIVABLE.includes(e.status))
      .reduce((sum, e) => sum + Number(e.original_amount), 0);
    const overdueReceivables = (receivables ?? []).filter(
      (e) => OPEN_STATUSES_RECEIVABLE.includes(e.status) && e.due_date < todayISO
    );
    receivableOverdueTotal = overdueReceivables.reduce((sum, e) => sum + Number(e.original_amount), 0);
    receivableOverdueCount = overdueReceivables.length;
  }

  // --------------------------------------------------------------------
  // Maiores entradas/saídas do mês + composição + comparação com mês anterior
  // --------------------------------------------------------------------
  let topInflows: any[] = [];
  let topOutflows: any[] = [];
  let monthRevenue = 0;
  let monthExpense = 0;
  let operatingResult = 0;
  let expensesByCategory: { name: string; total: number }[] = [];
  let revenueByCategory: { name: string; total: number }[] = [];
  let prevMonthRevenue = 0;
  let prevMonthExpense = 0;

  if (canSeeEntries) {
    const { data: monthSettlements } = await supabase
      .from("financial_settlements")
      .select(
        "amount, settlement_date, financial_entries(type, description, category_id, chart_account_categories(name, dre_behavior))"
      )
      .eq("status", "valido")
      .gte("settlement_date", monthStartISO)
      .lte("settlement_date", todayISO);

    const inflows = (monthSettlements ?? []).filter((s: any) => s.financial_entries?.type === "receita");
    const outflows = (monthSettlements ?? []).filter((s: any) => s.financial_entries?.type === "despesa");

    monthRevenue = inflows.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
    monthExpense = outflows.reduce((sum: number, s: any) => sum + Number(s.amount), 0);

    const operatingRevenue = inflows
      .filter((s: any) => s.financial_entries?.chart_account_categories?.dre_behavior === "incluir_operacional")
      .reduce((sum: number, s: any) => sum + Number(s.amount), 0);
    const operatingExpense = outflows
      .filter((s: any) => s.financial_entries?.chart_account_categories?.dre_behavior === "incluir_operacional")
      .reduce((sum: number, s: any) => sum + Number(s.amount), 0);
    operatingResult = operatingRevenue - operatingExpense;

    topInflows = [...inflows].sort((a: any, b: any) => Number(b.amount) - Number(a.amount)).slice(0, 5);
    topOutflows = [...outflows].sort((a: any, b: any) => Number(b.amount) - Number(a.amount)).slice(0, 5);

    function groupByCategory(items: any[]) {
      const map = new Map<string, number>();
      for (const item of items) {
        const name = item.financial_entries?.chart_account_categories?.name ?? "Sem categoria";
        map.set(name, (map.get(name) ?? 0) + Number(item.amount));
      }
      return Array.from(map.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    }
    expensesByCategory = groupByCategory(outflows);
    revenueByCategory = groupByCategory(inflows);

    const { data: prevMonthSettlements } = await supabase
      .from("financial_settlements")
      .select("amount, financial_entries(type)")
      .eq("status", "valido")
      .gte("settlement_date", prevMonthStartISO)
      .lte("settlement_date", prevMonthEndISO);

    prevMonthRevenue = (prevMonthSettlements ?? [])
      .filter((s: any) => s.financial_entries?.type === "receita")
      .reduce((sum: number, s: any) => sum + Number(s.amount), 0);
    prevMonthExpense = (prevMonthSettlements ?? [])
      .filter((s: any) => s.financial_entries?.type === "despesa")
      .reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  }

  function percentChange(current: number, previous: number): string {
    if (previous === 0) return current === 0 ? "0%" : "—";
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  }

  // --------------------------------------------------------------------
  // Alertas
  // --------------------------------------------------------------------
  const alerts: { level: "negative" | "warning"; title: string; description: string; href: string }[] = [];

  if (projection30 && projection30.projection.minBalance < 0) {
    alerts.push({
      level: "negative",
      title: "Caixa projetado fica negativo nos próximos 30 dias",
      description: `Menor saldo projetado: ${formatCurrency(projection30.projection.minBalance)} em ${formatDate(
        projection30.projection.minBalanceDate
      )}.`,
      href: "/fluxo-de-caixa/projetado?horizon=30",
    });
  }

  if (payableOverdueCount > 0) {
    alerts.push({
      level: "negative",
      title: `${payableOverdueCount} conta${payableOverdueCount > 1 ? "s" : ""} a pagar vencida${payableOverdueCount > 1 ? "s" : ""}`,
      description: `Total vencido: ${formatCurrency(payableOverdueTotal)}.`,
      href: "/contas-a-pagar?status=vencido",
    });
  }

  if (receivableOverdueCount > 0) {
    alerts.push({
      level: "warning",
      title: `${receivableOverdueCount} conta${receivableOverdueCount > 1 ? "s" : ""} a receber vencida${receivableOverdueCount > 1 ? "s" : ""}`,
      description: `Total vencido: ${formatCurrency(receivableOverdueTotal)}.`,
      href: "/contas-a-receber?status=vencido",
    });
  }

  if (canSeeBalances) {
    for (const a of businessAccounts) {
      const balance = accountBalances.get(a.id) ?? 0;
      if (a.minimum_balance !== null && a.minimum_balance !== undefined && balance < Number(a.minimum_balance)) {
        alerts.push({
          level: "warning",
          title: `Saldo de "${a.display_name}" abaixo do mínimo configurado`,
          description: `Saldo atual: ${formatCurrency(balance)} — mínimo configurado: ${formatCurrency(Number(a.minimum_balance))}.`,
          href: `/cadastros/contas-bancarias/${a.id}`,
        });
      }
    }

    // Última conferência de saldo de cada conta empresarial, se houver diferença
    for (const a of businessAccounts) {
      const { data: lastSnapshot } = await supabase
        .from("bank_balance_snapshots")
        .select("informed_balance, calculated_balance, snapshot_date")
        .eq("bank_account_id", a.id)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastSnapshot) {
        const diff = Number(lastSnapshot.informed_balance) - Number(lastSnapshot.calculated_balance);
        if (Math.abs(diff) > 0.01) {
          alerts.push({
            level: "warning",
            title: `Diferença de saldo não resolvida em "${a.display_name}"`,
            description: `Diferença de ${formatCurrency(diff)} identificada em ${formatDate(lastSnapshot.snapshot_date)}.`,
            href: `/cadastros/contas-bancarias/${a.id}`,
          });
        }
      }
    }
  }

  const roleLabel = profile?.role_key === "admin" ? "Administrador" : "Operador";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-soft">
          {organization?.name} — {profile?.full_name} ({roleLabel})
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <AlertItem key={i} level={a.level} title={a.title} description={a.description} href={a.href} />
          ))}
        </div>
      )}

      {canSeeBalances && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-ink">Caixa</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <MetricCard
              label="Saldo empresarial disponível"
              value={formatCurrency(businessAvailableTotal)}
              size="lg"
              href="/cadastros/contas-bancarias"
            />
            <MetricCard
              label="Geração de caixa no mês"
              value={formatCurrency(cashGeneratedThisMonth)}
              tone={cashGeneratedThisMonth >= 0 ? "positive" : "negative"}
              href="/fluxo-de-caixa/realizado"
            />
            <MetricCard
              label="Caixa projetado em 30 dias"
              value={formatCurrency(projection30?.projection.finalBalance ?? businessAvailableTotal)}
              tone={(projection30?.projection.finalBalance ?? 0) < 0 ? "negative" : "default"}
              href="/fluxo-de-caixa/projetado?horizon=30"
            />
            <MetricCard
              label="Menor saldo projetado (90 dias)"
              value={formatCurrency(projection30 ? Math.min(projection7Final, projection30.projection.minBalance, projection90Final) : businessAvailableTotal)}
              tone="negative"
              href="/fluxo-de-caixa/projetado?horizon=90"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Caixa projetado — 7 dias" value={formatCurrency(projection7Final)} href="/fluxo-de-caixa/projetado?horizon=7" />
            <MetricCard label="Caixa projetado — 30 dias" value={formatCurrency(projection30?.projection.finalBalance ?? 0)} href="/fluxo-de-caixa/projetado?horizon=30" />
            <MetricCard label="Caixa projetado — 90 dias" value={formatCurrency(projection90Final)} href="/fluxo-de-caixa/projetado?horizon=90" />
          </div>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-ink">Saldo por conta</h3>
            <div className="space-y-2">
              {businessAccounts.map((a) => (
                <Link
                  key={a.id}
                  href={`/cadastros/contas-bancarias/${a.id}`}
                  className="flex items-center justify-between rounded-card px-3 py-2 text-sm hover:bg-base-bg"
                >
                  <span className="text-ink-soft">{a.display_name}</span>
                  <span className="num font-medium text-ink">{formatCurrency(accountBalances.get(a.id) ?? 0)}</span>
                </Link>
              ))}
              {businessAccounts.length === 0 && <p className="text-sm text-ink-faint">Nenhuma conta empresarial cadastrada.</p>}
            </div>
          </Card>

          {canSeePersonal && personalAccounts.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-ink">Saldo pessoal (separado do empresarial)</h3>
              <div className="space-y-2">
                {personalAccounts.map((a) => (
                  <Link
                    key={a.id}
                    href={`/cadastros/contas-bancarias/${a.id}`}
                    className="flex items-center justify-between rounded-card px-3 py-2 text-sm hover:bg-base-bg"
                  >
                    <span className="text-ink-soft">{a.display_name}</span>
                    <span className="num font-medium text-ink">{formatCurrency(accountBalances.get(a.id) ?? 0)}</span>
                  </Link>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-faint">
                Total pessoal: <span className="num">{formatCurrency(personalTotal)}</span> — nunca somado ao saldo
                empresarial acima.
              </p>
            </Card>
          )}
        </section>
      )}

      {canSeeEntries && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-ink">Contas a pagar e a receber</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <MetricCard label="Total a pagar em aberto" value={formatCurrency(payableOpenTotal)} tone="warning" href="/contas-a-pagar" />
            <MetricCard label="Total a pagar vencido" value={formatCurrency(payableOverdueTotal)} tone="negative" href="/contas-a-pagar?status=vencido" />
            <MetricCard label="Total a receber em aberto" value={formatCurrency(receivableOpenTotal)} tone="warning" href="/contas-a-receber" />
            <MetricCard label="Total a receber vencido" value={formatCurrency(receivableOverdueTotal)} tone="negative" href="/contas-a-receber?status=vencido" />
          </div>
        </section>
      )}

      {canSeeEntries && (topInflows.length > 0 || topOutflows.length > 0) && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-ink">Maiores entradas do mês</h3>
            {topInflows.length === 0 ? (
              <p className="text-sm text-ink-faint">Nenhuma entrada este mês.</p>
            ) : (
              <ul className="space-y-2">
                {topInflows.map((s: any, i: number) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">{s.financial_entries?.description}</span>
                    <span className="num text-ink">{formatCurrency(s.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-ink">Maiores saídas do mês</h3>
            {topOutflows.length === 0 ? (
              <p className="text-sm text-ink-faint">Nenhuma saída este mês.</p>
            ) : (
              <ul className="space-y-2">
                {topOutflows.map((s: any, i: number) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">{s.financial_entries?.description}</span>
                    <span className="num text-ink">{formatCurrency(s.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}

      {canSeeEntries && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink-soft">Indicadores secundários</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Receita do mês" value={formatCurrency(monthRevenue)} sublabel={`vs. mês anterior: ${percentChange(monthRevenue, prevMonthRevenue)}`} />
            <MetricCard label="Despesa do mês" value={formatCurrency(monthExpense)} sublabel={`vs. mês anterior: ${percentChange(monthExpense, prevMonthExpense)}`} />
            <MetricCard
              label="Resultado operacional preliminar"
              value={formatCurrency(operatingResult)}
              tone={operatingResult >= 0 ? "positive" : "negative"}
              sublabel="Cálculo simplificado — DRE completa na Fase 8"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-ink">Despesas por categoria (mês)</h3>
              {expensesByCategory.length === 0 ? (
                <p className="text-sm text-ink-faint">Nenhuma despesa este mês.</p>
              ) : (
                <ul className="space-y-2">
                  {expensesByCategory.map((c) => (
                    <li key={c.name} className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">{c.name}</span>
                      <span className="num text-ink">{formatCurrency(c.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-ink">Receitas por origem (mês)</h3>
              {revenueByCategory.length === 0 ? (
                <p className="text-sm text-ink-faint">Nenhuma receita este mês.</p>
              ) : (
                <ul className="space-y-2">
                  {revenueByCategory.map((c) => (
                    <li key={c.name} className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">{c.name}</span>
                      <span className="num text-ink">{formatCurrency(c.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
