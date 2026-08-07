import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { BalanceSnapshotForm } from "../balance-snapshot-form";
import { EditInitialBalanceForm } from "../edit-initial-balance-form";
import { notFound } from "next/navigation";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

type Movement = {
  date: string;
  description: string;
  amount: number; // positivo = entrada, negativo = saída
  kind: "recebimento" | "pagamento" | "transferencia";
};

export default async function ContaBancariaDetalhePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const canEdit = await hasPermission("alterar_contas_bancarias");

  const { data: account } = await supabase
    .from("bank_accounts")
    .select("id, display_name, bank_name, ownership, initial_balance, initial_balance_date")
    .eq("id", params.id)
    .single();

  if (!account) notFound();

  const { data: currentBalance } = await supabase.rpc("bank_account_balance", { p_account_id: account.id });

  const [{ data: settlements }, { data: transfersOut }, { data: transfersIn }, { data: snapshots }] =
    await Promise.all([
      supabase
        .from("financial_settlements")
        .select("settlement_date, amount, financial_entries(description, type)")
        .eq("bank_account_id", account.id)
        .eq("status", "valido"),
      supabase
        .from("transfers")
        .select("transfer_date, amount, to:to_bank_account_id(display_name)")
        .eq("from_bank_account_id", account.id)
        .eq("status", "valido"),
      supabase
        .from("transfers")
        .select("transfer_date, amount, from:from_bank_account_id(display_name)")
        .eq("to_bank_account_id", account.id)
        .eq("status", "valido"),
      supabase
        .from("bank_balance_snapshots")
        .select("id, snapshot_date, calculated_balance, informed_balance, notes")
        .eq("bank_account_id", account.id)
        .order("snapshot_date", { ascending: false })
        .limit(10),
    ]);

  const movements: Movement[] = [
    ...(settlements ?? []).map((s: any) => ({
      date: s.settlement_date,
      description: s.financial_entries?.description ?? "Lançamento",
      amount: s.financial_entries?.type === "receita" ? Number(s.amount) : -Number(s.amount),
      kind: (s.financial_entries?.type === "receita" ? "recebimento" : "pagamento") as Movement["kind"],
    })),
    ...(transfersOut ?? []).map((t: any) => ({
      date: t.transfer_date,
      description: `Transferência para ${t.to?.display_name ?? "outra conta"}`,
      amount: -Number(t.amount),
      kind: "transferencia" as const,
    })),
    ...(transfersIn ?? []).map((t: any) => ({
      date: t.transfer_date,
      description: `Transferência de ${t.from?.display_name ?? "outra conta"}`,
      amount: Number(t.amount),
      kind: "transferencia" as const,
    })),
  ];

  movements.sort((a, b) => a.date.localeCompare(b.date));

  let running = Number(account.initial_balance);
  const withRunningBalance = movements.map((m) => {
    running += m.amount;
    return { ...m, runningBalance: running };
  });
  withRunningBalance.reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{account.display_name}</h1>
        <p className="text-sm text-ink-soft">{account.bank_name}</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Saldo atual</p>
            <p className="num mt-1 text-xl font-semibold text-ink">{formatCurrency(currentBalance ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Saldo inicial</p>
            <p className="num mt-1 text-xl font-semibold text-ink-soft">{formatCurrency(account.initial_balance)}</p>
            <p className="text-xs text-ink-faint">em {formatDate(account.initial_balance_date)}</p>
          </div>
        </div>
      </Card>

      {canEdit && (
        <Card>
          <h2 className="mb-1 text-base font-semibold text-ink">Editar saldo inicial</h2>
          <p className="mb-3 text-sm text-ink-soft">
            Use isto para corrigir o saldo inicial de uma conta já criada — por exemplo, se ela
            foi cadastrada antes de você ter o valor exato. A mudança afeta o saldo calculado a
            partir de agora; nenhuma liquidação já registrada é alterada.
          </p>
          <EditInitialBalanceForm
            bankAccountId={account.id}
            currentBalance={Number(account.initial_balance)}
            currentDate={account.initial_balance_date}
          />
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Extrato</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Data</th>
                <th className="py-2 pr-4 font-medium">Descrição</th>
                <th className="py-2 pr-4 font-medium num">Valor</th>
                <th className="py-2 pr-4 font-medium num">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {withRunningBalance.map((m, i) => (
                <tr key={i} className="border-b border-base-border last:border-0">
                  <td className="py-2 pr-4 text-ink-soft">{formatDate(m.date)}</td>
                  <td className="py-2 pr-4 text-ink">{m.description}</td>
                  <td className={`num py-2 pr-4 ${m.amount >= 0 ? "text-signal-positive" : "text-signal-negative"}`}>
                    {m.amount >= 0 ? "+" : ""}
                    {formatCurrency(m.amount)}
                  </td>
                  <td className="num py-2 pr-4 text-ink-soft">{formatCurrency(m.runningBalance)}</td>
                </tr>
              ))}
              {withRunningBalance.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-ink-faint">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {canEdit && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Conferência de saldo</h2>
          <p className="mb-3 text-sm text-ink-soft">
            Compare o saldo calculado pelo sistema com o saldo informado pelo extrato do banco.
            Diferenças ficam registradas — nenhum ajuste é feito automaticamente.
          </p>
          <BalanceSnapshotForm bankAccountId={account.id} />

          {snapshots && snapshots.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-border text-left text-ink-soft">
                    <th className="py-2 pr-4 font-medium">Data</th>
                    <th className="py-2 pr-4 font-medium num">Saldo calculado</th>
                    <th className="py-2 pr-4 font-medium num">Saldo informado</th>
                    <th className="py-2 pr-4 font-medium num">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => {
                    const diff = Number(s.informed_balance) - Number(s.calculated_balance);
                    return (
                      <tr key={s.id} className="border-b border-base-border last:border-0">
                        <td className="py-2 pr-4 text-ink-soft">{formatDate(s.snapshot_date)}</td>
                        <td className="num py-2 pr-4 text-ink-soft">{formatCurrency(s.calculated_balance)}</td>
                        <td className="num py-2 pr-4 text-ink-soft">{formatCurrency(s.informed_balance)}</td>
                        <td className={`num py-2 pr-4 ${diff === 0 ? "text-ink-soft" : "text-signal-negative"}`}>
                          {formatCurrency(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
