import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { ProjectionFilter } from "./projection-filter";
import { computeRemainingBalance } from "@/lib/finance/remaining";
import { projectCashflow, type ProjectionMovement } from "@/lib/finance/projection";
import Link from "next/link";

const OPEN_STATUSES = ["em_aberto", "agendado", "parcialmente_pago", "parcialmente_recebido"];

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

export default async function FluxoDeCaixaProjetadoPage({
  searchParams,
}: {
  searchParams: { horizon?: string; to?: string; personal?: string; account?: string };
}) {
  const supabase = createClient();
  const canSeePersonal = await hasPermission("visualizar_contas_pessoais");

  const today = toISODate(new Date());
  const horizonDays = searchParams.to ? null : Number(searchParams.horizon || "30");
  const horizonEnd = searchParams.to
    ? searchParams.to
    : toISODate(new Date(Date.now() + horizonDays! * 24 * 60 * 60 * 1000));

  const includePersonal = searchParams.personal === "1" && canSeePersonal;
  const accountFilter = searchParams.account || "";

  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, name:display_name, ownership")
    .eq("status", "ativa")
    .eq("consider_in_business_dashboard", true);

  const includedAccounts = (accounts ?? []).filter((a) => {
    if (accountFilter) return a.id === accountFilter;
    return includePersonal ? true : a.ownership !== "pessoa_fisica";
  });
  const accountIds = includedAccounts.map((a) => a.id);

  const currentBalanceResults = await Promise.all(
    accountIds.map((id) => supabase.rpc("bank_account_balance", { p_account_id: id }))
  );
  const currentBalance = currentBalanceResults.reduce((sum, r) => sum + Number(r.data ?? 0), 0);

  let openEntries: any[] = [];

  if (accountFilter) {
    const { data } = await supabase
      .from("financial_entries")
      .select("id, type, description, original_amount, due_date, bank_account_id")
      .in("status", OPEN_STATUSES)
      .lte("due_date", horizonEnd)
      .eq("bank_account_id", accountFilter);
    openEntries = data ?? [];
  } else if (accountIds.length > 0) {
    const { data } = await supabase
      .from("financial_entries")
      .select("id, type, description, original_amount, due_date, bank_account_id")
      .in("status", OPEN_STATUSES)
      .lte("due_date", horizonEnd)
      .or(`bank_account_id.in.(${accountIds.join(",")}),bank_account_id.is.null`);
    openEntries = data ?? [];
  }

  const entryIds = openEntries.map((e) => e.id);

  const { data: settlements } =
    entryIds.length > 0
      ? await supabase
          .from("financial_settlements")
          .select("entry_id, amount, interest, penalty, discount, addition, status")
          .in("entry_id", entryIds)
      : { data: [] as any[] };

  const entriesWithRemaining = openEntries
    .map((e) => ({
      ...e,
      remaining: computeRemainingBalance(Number(e.original_amount), e.id, settlements ?? []),
      effectiveDate: e.due_date < today ? today : e.due_date,
    }))
    .filter((e) => e.remaining > 0.004);

  const movements: ProjectionMovement[] = entriesWithRemaining.map((e) => ({
    date: e.effectiveDate,
    amount: e.type === "receita" ? e.remaining : -e.remaining,
  }));

  const projection = projectCashflow(currentBalance, movements, today, horizonEnd);

  const entradasPrevistas = entriesWithRemaining
    .filter((e) => e.type === "receita")
    .reduce((sum, e) => sum + e.remaining, 0);
  const saidasPrevistas = entriesWithRemaining
    .filter((e) => e.type === "despesa")
    .reduce((sum, e) => sum + e.remaining, 0);

  const topImpact = [...entriesWithRemaining].sort((a, b) => b.remaining - a.remaining).slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Fluxo de caixa projetado</h1>
        <p className="text-sm text-ink-soft">
          Considera contas em aberto, agendadas, parcialmente liquidadas e vencidas. Valores já
          pagos ou recebidos não são somados de novo.
        </p>
      </div>

      <Card>
        <ProjectionFilter
          horizonDays={horizonDays}
          customTo={searchParams.to || ""}
          includePersonal={includePersonal}
          canSeePersonal={canSeePersonal}
          accountId={accountFilter}
          bankAccounts={(accounts ?? []) as any}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Saldo atual</p>
          <p className="num mt-1 text-lg font-semibold text-ink-soft">{formatCurrency(currentBalance)}</p>
        </div>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            Saldo projetado em {formatDate(horizonEnd)}
          </p>
          <p
            className={`num mt-1 text-lg font-semibold ${
              projection.finalBalance < 0 ? "text-signal-negative" : "text-ink"
            }`}
          >
            {formatCurrency(projection.finalBalance)}
          </p>
        </div>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Menor saldo projetado</p>
          <p
            className={`num mt-1 text-lg font-semibold ${
              projection.minBalance < 0 ? "text-signal-negative" : "text-ink"
            }`}
          >
            {formatCurrency(projection.minBalance)}
          </p>
          <p className="text-xs text-ink-faint">em {formatDate(projection.minBalanceDate)}</p>
        </div>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Dias com saldo negativo</p>
          <p
            className={`num mt-1 text-lg font-semibold ${
              projection.negativeDaysCount > 0 ? "text-signal-negative" : "text-ink"
            }`}
          >
            {projection.negativeDaysCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Entradas previstas</p>
          <p className="num mt-1 text-lg font-semibold text-signal-positive">{formatCurrency(entradasPrevistas)}</p>
        </div>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Saídas previstas</p>
          <p className="num mt-1 text-lg font-semibold text-signal-negative">{formatCurrency(saidasPrevistas)}</p>
        </div>
      </div>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Lançamentos que mais impactam o caixa</h2>
        {topImpact.length === 0 ? (
          <p className="text-sm text-ink-faint">Nenhum lançamento em aberto no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Descrição</th>
                  <th className="py-2 pr-4 font-medium">Vencimento</th>
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium num">Valor restante</th>
                </tr>
              </thead>
              <tbody>
                {topImpact.map((e) => (
                  <tr key={e.id} className="border-b border-base-border last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`${e.type === "despesa" ? "/contas-a-pagar" : "/contas-a-receber"}/${e.id}`}
                        className="text-ink hover:text-brand-accent hover:underline"
                      >
                        {e.description}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-ink-soft">{formatDate(e.due_date)}</td>
                    <td className="py-2 pr-4 text-ink-soft">{e.type === "despesa" ? "Despesa" : "Receita"}</td>
                    <td className="num py-2 pr-4 text-ink">{formatCurrency(e.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Evolução do saldo projetado</h2>
        {projection.checkpoints.length === 0 ? (
          <p className="text-sm text-ink-faint">Nenhuma movimentação prevista no período — o saldo permanece constante.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Data</th>
                  <th className="py-2 pr-4 font-medium num">Movimentação</th>
                  <th className="py-2 pr-4 font-medium num">Saldo projetado</th>
                </tr>
              </thead>
              <tbody>
                {projection.checkpoints.map((c) => (
                  <tr key={c.date} className="border-b border-base-border last:border-0">
                    <td className="py-2 pr-4 text-ink-soft">{formatDate(c.date)}</td>
                    <td className={`num py-2 pr-4 ${c.delta >= 0 ? "text-signal-positive" : "text-signal-negative"}`}>
                      {c.delta >= 0 ? "+" : ""}
                      {formatCurrency(c.delta)}
                    </td>
                    <td className={`num py-2 pr-4 font-medium ${c.balance < 0 ? "text-signal-negative" : "text-ink"}`}>
                      {formatCurrency(c.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
