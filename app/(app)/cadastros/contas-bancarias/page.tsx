import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStatusButton } from "@/components/ui/toggle-status-button";
import { NewBankAccountForm } from "./new-bank-account-form";
import { toggleBankAccountStatusAction } from "./actions";
import Link from "next/link";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  conta_corrente: "Conta corrente",
  conta_pagamento: "Conta de pagamento",
  poupanca: "Poupança",
  caixa: "Caixa",
  investimento_liquidez: "Investimento com liquidez",
  outro: "Outro",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function AccountsTable({
  accounts,
  canEdit,
}: {
  accounts: any[];
  canEdit: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-base-border text-left text-ink-soft">
            <th className="py-2 pr-4 font-medium">Conta</th>
            <th className="py-2 pr-4 font-medium">Banco</th>
            <th className="py-2 pr-4 font-medium">Tipo</th>
            <th className="py-2 pr-4 font-medium num">Saldo atual</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            {canEdit && <th className="py-2 pr-4 font-medium">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-b border-base-border last:border-0">
              <td className="py-2 pr-4">
                <Link href={`/cadastros/contas-bancarias/${a.id}`} className="text-ink hover:text-brand-accent hover:underline">
                  {a.display_name}
                </Link>
              </td>
              <td className="py-2 pr-4 text-ink-soft">{a.bank_name ?? "—"}</td>
              <td className="py-2 pr-4 text-ink-soft">{ACCOUNT_TYPE_LABELS[a.account_type]}</td>
              <td className="num py-2 pr-4 text-ink">{formatCurrency(a.currentBalance)}</td>
              <td className="py-2 pr-4">
                <StatusBadge status={a.status} />
              </td>
              {canEdit && (
                <td className="py-2 pr-4">
                  <ToggleStatusButton
                    isActive={a.status === "ativa"}
                    action={toggleBankAccountStatusAction.bind(null, a.id, a.status)}
                  />
                </td>
              )}
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={canEdit ? 6 : 5} className="py-4 text-center text-ink-faint">
                Nenhuma conta cadastrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function ContasBancariasPage() {
  const supabase = createClient();
  const canEdit = await hasPermission("alterar_contas_bancarias");
  const canSeePersonal = await hasPermission("visualizar_contas_pessoais");

  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select(
      "id, display_name, bank_name, account_type, ownership, initial_balance, status"
    )
    .order("display_name");

  const accountsWithBalance = await Promise.all(
    (accounts ?? []).map(async (a) => {
      const { data: balance } = await supabase.rpc("bank_account_balance", { p_account_id: a.id });
      return { ...a, currentBalance: balance ?? a.initial_balance };
    })
  );

  const businessAccounts = accountsWithBalance.filter((a) => a.ownership === "deck03" || a.ownership === "outro");
  const personalAccounts = accountsWithBalance.filter((a) => a.ownership === "pessoa_fisica");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Contas bancárias</h1>
        <p className="text-sm text-ink-soft">
          O saldo de contas pessoais nunca é somado automaticamente ao saldo empresarial.
        </p>
      </div>

      <Card>
        {canEdit && (
          <div className="mb-6">
            <NewBankAccountForm />
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-base font-semibold text-ink">Contas empresariais</h2>
            <AccountsTable accounts={businessAccounts} canEdit={canEdit} />
          </div>

          {canSeePersonal && (
            <div>
              <h2 className="mb-3 text-base font-semibold text-ink">Contas pessoais</h2>
              <AccountsTable accounts={personalAccounts} canEdit={canEdit} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
