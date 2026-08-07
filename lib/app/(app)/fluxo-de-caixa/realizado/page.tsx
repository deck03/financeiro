import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { PeriodFilter } from "./period-filter";
import { ExportButtons } from "@/components/export-buttons";
import { splitRealizedItems, sumByCategory, sumAmounts, netSignedTotal } from "@/lib/finance/realized-split";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dayBefore(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

function mapSettlements(rows: any[]) {
  return rows
    .filter((s) => s.financial_entries)
    .map((s) => ({
      type: s.financial_entries.type as string,
      amount: Number(s.amount),
      categoryName: s.financial_entries.chart_account_categories?.name ?? "Sem categoria",
      dreBehavior: s.financial_entries.chart_account_categories?.dre_behavior ?? "incluir_operacional",
    }));
}

export default async function FluxoDeCaixaRealizadoPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; personal?: string };
}) {
  const supabase = createClient();
  const canSeePersonal = await hasPermission("visualizar_contas_pessoais");
  const canExport = await hasPermission("exportar_relatorios");

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = searchParams.from || toISODate(firstOfMonth);
  const to = searchParams.to || toISODate(today);
  const includePersonal = searchParams.personal === "1" && canSeePersonal;

  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, display_name, ownership")
    .eq("status", "ativa")
    .eq("consider_in_business_dashboard", true);

  const includedAccounts = (accounts ?? []).filter((a) =>
    includePersonal ? true : a.ownership !== "pessoa_fisica"
  );
  const accountIds = includedAccounts.map((a) => a.id);

  const [initialBalances, finalBalances] = await Promise.all([
    Promise.all(
      accountIds.map((id) => supabase.rpc("bank_account_balance_at", { p_account_id: id, p_as_of: dayBefore(from) }))
    ),
    Promise.all(
      accountIds.map((id) => supabase.rpc("bank_account_balance_at", { p_account_id: id, p_as_of: to }))
    ),
  ]);

  const saldoInicial = initialBalances.reduce((sum, r) => sum + Number(r.data ?? 0), 0);
  const saldoFinal = finalBalances.reduce((sum, r) => sum + Number(r.data ?? 0), 0);

  let realizedItems: ReturnType<typeof mapSettlements> = [];

  if (accountIds.length > 0) {
    const { data: settlements } = await supabase
      .from("financial_settlements")
      .select(
        "amount, settlement_date, bank_account_id, financial_entries(type, category_id, chart_account_categories(name, dre_behavior))"
      )
      .in("bank_account_id", accountIds)
      .eq("status", "valido")
      .gte("settlement_date", from)
      .lte("settlement_date", to);

    realizedItems = mapSettlements(settlements ?? []);
  }

  // Mesma regra da DRE: categorias marcadas como "não incluir" são
  // movimentações de sócios/pessoa física — mesmo quando pagas pela conta
  // empresarial, não entram como entrada/saída do fluxo de caixa da
  // empresa. Ficam à parte, em linha própria, para o saldo continuar
  // fazendo sentido sem esconder nenhum valor.
  const { operational, partners } = splitRealizedItems(realizedItems);
  const entradas = operational.filter((i) => i.type === "receita");
  const saidas = operational.filter((i) => i.type === "despesa");

  const totalEntradas = sumAmounts(entradas);
  const totalSaidas = sumAmounts(saidas);
  const totalSocios = netSignedTotal(partners);

  const entradasPorCategoria = sumByCategory(entradas);
  const saidasPorCategoria = sumByCategory(saidas);
  const sociosPorCategoria = sumByCategory(
    partners.map((p) => ({ ...p, amount: p.type === "receita" ? p.amount : -p.amount }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Fluxo de caixa realizado</h1>
        <p className="text-sm text-ink-soft">
          Apenas valores efetivamente pagos ou recebidos no período. Transferências não entram
          como entrada ou saída, e despesas/receitas de sócios ou pessoa física — mesmo pagas
          pela conta empresarial — aparecem à parte, não nas Entradas/Saídas.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PeriodFilter from={from} to={to} includePersonal={includePersonal} canSeePersonal={canSeePersonal} />
          {canExport && (
            <ExportButtons
              options={(() => {
                const qs = new URLSearchParams({ from, to });
                if (includePersonal) qs.set("personal", "1");
                return [
                  { label: "Exportar CSV", href: `/api/export/fluxo-realizado?${qs.toString()}&format=csv` },
                  { label: "Exportar Excel", href: `/api/export/fluxo-realizado?${qs.toString()}&format=xlsx` },
                ];
              })()}
            />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Saldo inicial</p>
          <p className="num mt-1 text-lg font-semibold text-ink-soft">{formatCurrency(saldoInicial)}</p>
        </div>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Entradas</p>
          <p className="num mt-1 text-lg font-semibold text-signal-positive">{formatCurrency(totalEntradas)}</p>
        </div>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Saídas</p>
          <p className="num mt-1 text-lg font-semibold text-signal-negative">{formatCurrency(totalSaidas)}</p>
        </div>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Saldo final</p>
          <p className="num mt-1 text-lg font-semibold text-ink">{formatCurrency(saldoFinal)}</p>
        </div>
      </div>

      {partners.length > 0 && (
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Movimentações de sócios / pessoa física</p>
              <p className="mt-0.5 text-xs text-ink-faint">
                Pagas ou recebidas pelas mesmas contas, mas fora do fluxo de caixa da empresa —
                por isso não entram em Entradas/Saídas acima. Mesma regra usada na DRE.
              </p>
            </div>
            <p className={`num text-lg font-semibold ${totalSocios >= 0 ? "text-signal-positive" : "text-signal-negative"}`}>
              {formatCurrency(totalSocios)}
            </p>
          </div>
          <ul className="mt-3 space-y-2 border-t border-base-border pt-3">
            {sociosPorCategoria.map((c) => (
              <li key={c.name} className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{c.name}</span>
                <span className="num text-ink">{formatCurrency(c.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Composição das entradas</h2>
          {entradasPorCategoria.length === 0 ? (
            <p className="text-sm text-ink-faint">Nenhuma entrada no período.</p>
          ) : (
            <ul className="space-y-2">
              {entradasPorCategoria.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{c.name}</span>
                  <span className="num text-ink">{formatCurrency(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Composição das saídas</h2>
          {saidasPorCategoria.length === 0 ? (
            <p className="text-sm text-ink-faint">Nenhuma saída no período.</p>
          ) : (
            <ul className="space-y-2">
              {saidasPorCategoria.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{c.name}</span>
                  <span className="num text-ink">{formatCurrency(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
