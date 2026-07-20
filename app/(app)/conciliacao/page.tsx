import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ReconciliationPanel } from "./reconciliation-panel";
import { UndoReconciliationButton, UnignoreButton } from "./reconciliation-buttons";
import { computeRemainingBalance } from "@/lib/finance/remaining";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function ConciliacaoPage({
  searchParams,
}: {
  searchParams: { account?: string };
}) {
  const supabase = createClient();
  const canReconcile = await hasPermission("realizar_conciliacao");

  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, display_name")
    .eq("status", "ativa")
    .order("display_name");

  const accountId = searchParams.account || accounts?.[0]?.id || "";

  if (!accountId) {
    return (
      <Card>
        <p className="text-sm text-ink-faint">Nenhuma conta bancária cadastrada.</p>
      </Card>
    );
  }

  const [
    { data: pending },
    { data: reconciled },
    { data: ignored },
    { data: openDespesas },
    { data: openReceitas },
    { data: categories },
    { data: costCenters },
    { data: counterparties },
    { data: paymentMethods },
  ] = await Promise.all([
    supabase
      .from("bank_transactions")
      .select("id, transaction_date, amount, description")
      .eq("bank_account_id", accountId)
      .eq("status", "nao_conciliada")
      .order("transaction_date", { ascending: false }),
    supabase
      .from("bank_transactions")
      .select(
        "id, transaction_date, amount, description, reconciliation_links(settlement_id, financial_settlements(entry_id, financial_entries(description)))"
      )
      .eq("bank_account_id", accountId)
      .eq("status", "conciliada")
      .order("transaction_date", { ascending: false })
      .limit(50),
    supabase
      .from("bank_transactions")
      .select("id, transaction_date, amount, description")
      .eq("bank_account_id", accountId)
      .eq("status", "ignorada")
      .order("transaction_date", { ascending: false })
      .limit(50),
    supabase
      .from("financial_entries")
      .select("id, description, due_date, original_amount")
      .eq("type", "despesa")
      .in("status", ["em_aberto", "agendado", "parcialmente_pago"])
      .order("due_date"),
    supabase
      .from("financial_entries")
      .select("id, description, due_date, original_amount")
      .eq("type", "receita")
      .in("status", ["em_aberto", "agendado", "parcialmente_recebido"])
      .order("due_date"),
    supabase.from("chart_account_categories").select("id, name").eq("status", "ativo").order("name"),
    supabase.from("cost_centers").select("id, name").eq("status", "ativo").order("name"),
    supabase.from("counterparties").select("id, name").eq("status", "ativo").order("name"),
    supabase.from("payment_methods").select("id, name").eq("status", "ativo").order("name"),
  ]);

  const { data: subcategories } = await supabase
    .from("chart_account_subcategories")
    .select("id, name, category_id")
    .eq("status", "ativo");

  // saldo restante de cada lançamento em aberto, para exibir e permitir escolher
  async function withRemaining(entries: any[]) {
    if (!entries || entries.length === 0) return [];
    const ids = entries.map((e) => e.id);
    const { data: settlements } = await supabase
      .from("financial_settlements")
      .select("entry_id, amount, interest, penalty, discount, addition, status")
      .in("entry_id", ids);
    return entries.map((e) => ({
      id: e.id,
      description: e.description,
      due_date: e.due_date,
      remaining: computeRemainingBalance(Number(e.original_amount), e.id, settlements ?? []),
    }));
  }

  const despesasWithRemaining = await withRemaining(openDespesas ?? []);
  const receitasWithRemaining = await withRemaining(openReceitas ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Conciliação bancária</h1>
          <p className="text-sm text-ink-soft">
            Vincule as transações importadas aos lançamentos do sistema, ou crie um lançamento
            novo direto a partir da transação.
          </p>
        </div>
        <Link href="/importacao-ofx">
          <span className="inline-flex items-center rounded-card border border-base-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-base-bg">
            Importar OFX
          </span>
        </Link>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          {(accounts ?? []).map((a) => (
            <Link
              key={a.id}
              href={`/conciliacao?account=${a.id}`}
              className={`rounded-card border px-3 py-1.5 text-sm font-medium ${
                a.id === accountId
                  ? "border-brand-accent bg-brand-accentSoft text-brand-accent"
                  : "border-base-border bg-white text-ink-soft hover:bg-base-bg"
              }`}
            >
              {a.display_name}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Para comparar o saldo calculado com o saldo do extrato bancário, use a "Conferência de
          saldo" na página de detalhe da conta em Contas Bancárias.
        </p>
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Não conciliadas ({(pending ?? []).length})</h2>
        {(pending ?? []).length === 0 ? (
          <p className="text-sm text-ink-faint">Nenhuma transação pendente de conciliação.</p>
        ) : (
          <div className="space-y-3">
            {(pending ?? []).map((t) => (
              <div key={t.id} className="rounded-card border border-base-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-ink">{t.description}</p>
                    <p className="text-xs text-ink-faint">{formatDate(t.transaction_date)}</p>
                  </div>
                  <p className={`num text-sm font-medium ${t.amount >= 0 ? "text-signal-positive" : "text-signal-negative"}`}>
                    {formatCurrency(t.amount)}
                  </p>
                </div>
                {canReconcile && (
                  <div className="mt-3">
                    <ReconciliationPanel
                      bankTransactionId={t.id}
                      amount={t.amount}
                      description={t.description}
                      openEntries={t.amount >= 0 ? receitasWithRemaining : despesasWithRemaining}
                      categories={categories ?? []}
                      subcategories={subcategories ?? []}
                      costCenters={costCenters ?? []}
                      counterparties={counterparties ?? []}
                      paymentMethods={paymentMethods ?? []}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Conciliadas recentemente</h2>
        {(reconciled ?? []).length === 0 ? (
          <p className="text-sm text-ink-faint">Nenhuma transação conciliada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Data</th>
                  <th className="py-2 pr-4 font-medium">Transação</th>
                  <th className="py-2 pr-4 font-medium">Vinculada a</th>
                  <th className="py-2 pr-4 font-medium num">Valor</th>
                  {canReconcile && <th className="py-2 pr-4 font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {(reconciled ?? []).map((t: any) => (
                  <tr key={t.id} className="border-b border-base-border last:border-0">
                    <td className="py-2 pr-4 text-ink-soft">{formatDate(t.transaction_date)}</td>
                    <td className="py-2 pr-4 text-ink">{t.description}</td>
                    <td className="py-2 pr-4 text-ink-soft">
                      {t.reconciliation_links?.[0]?.financial_settlements?.financial_entries?.description ?? "—"}
                    </td>
                    <td className="num py-2 pr-4 text-ink">{formatCurrency(t.amount)}</td>
                    {canReconcile && (
                      <td className="py-2 pr-4">
                        <UndoReconciliationButton bankTransactionId={t.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {(ignored ?? []).length > 0 && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Ignoradas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Data</th>
                  <th className="py-2 pr-4 font-medium">Descrição</th>
                  <th className="py-2 pr-4 font-medium num">Valor</th>
                  {canReconcile && <th className="py-2 pr-4 font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {(ignored ?? []).map((t) => (
                  <tr key={t.id} className="border-b border-base-border last:border-0">
                    <td className="py-2 pr-4 text-ink-soft">{formatDate(t.transaction_date)}</td>
                    <td className="py-2 pr-4 text-ink">{t.description}</td>
                    <td className="num py-2 pr-4 text-ink">{formatCurrency(t.amount)}</td>
                    {canReconcile && (
                      <td className="py-2 pr-4">
                        <UnignoreButton bankTransactionId={t.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
