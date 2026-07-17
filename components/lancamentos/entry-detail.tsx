import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { EntryStatusBadge } from "@/components/ui/entry-status-badge";
import { SettleForm } from "./settle-form";
import { CancelForm } from "./cancel-form";
import { AttachmentsPanel } from "./attachments-panel";
import { ReverseSettlementButton } from "./reverse-settlement-button";
import { notFound } from "next/navigation";
import Link from "next/link";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value ?? "—"}</p>
    </div>
  );
}

const SETTLED_STATUSES = ["em_aberto", "agendado", "parcialmente_pago", "parcialmente_recebido"];

export async function EntryDetail({ entryId, type }: { entryId: string; type: "receita" | "despesa" }) {
  const supabase = createClient();
  const basePath = type === "despesa" ? "/contas-a-pagar" : "/contas-a-receber";

  const { data: entry } = await supabase
    .from("financial_entries")
    .select(
      `id, description, original_amount, due_date, issue_date, competence_date, document_number,
       notes, status, type, organization_id, installment_group_id, installment_number, installment_total,
       recurring_rule_id,
       counterparties(name), chart_account_categories(name), chart_account_subcategories(name),
       cost_centers(name), bank_accounts(display_name), payment_methods(name),
       installment_groups(description, installments_count),
       recurring_rules(description, frequency)`
    )
    .eq("id", entryId)
    .eq("type", type)
    .single();

  if (!entry) notFound();

  const [
    { data: settlements },
    { data: attachments },
    { data: bankAccounts },
    { data: paymentMethods },
    { data: remainingBalance },
    { data: siblings },
  ] = await Promise.all([
    supabase
      .from("financial_settlements")
      .select("id, amount, interest, penalty, discount, addition, settlement_date, status, notes, bank_accounts(display_name)")
      .eq("entry_id", entryId)
      .order("settlement_date", { ascending: false }),
    supabase
      .from("attachments")
      .select("id, file_name, file_path, file_size, created_at")
      .eq("entry_id", entryId)
      .order("created_at", { ascending: false }),
    supabase.from("bank_accounts").select("id, name:display_name, ownership").eq("status", "ativa").order("display_name"),
    supabase.from("payment_methods").select("id, name").eq("status", "ativo").order("name"),
    supabase.rpc("entry_remaining_balance", { p_entry_id: entryId }),
    entry.installment_group_id
      ? supabase
          .from("financial_entries")
          .select("id, description, due_date, status, original_amount, installment_number")
          .eq("installment_group_id", entry.installment_group_id)
          .order("installment_number", { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const canSettle =
    type === "despesa"
      ? await hasPermission("registrar_pagamentos")
      : await hasPermission("registrar_recebimentos");
  const canPartial =
    type === "despesa"
      ? await hasPermission("pagamentos_parciais")
      : await hasPermission("recebimentos_parciais");
  const canCancel = await hasPermission("cancelar_lancamentos");
  const canAttach = await hasPermission("anexar_documentos");

  const canSettleNow = canSettle && SETTLED_STATUSES.includes(entry.status);
  const canCancelNow = canCancel && ["rascunho", "em_aberto", "agendado"].includes(entry.status);

  const actionLabel = type === "despesa" ? "Pagamento" : "Recebimento";
  const installmentGroup = entry.installment_groups as any;
  const recurringRule = entry.recurring_rules as any;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{entry.description}</h1>
          <p className="num mt-1 text-2xl font-semibold text-ink">{formatCurrency(entry.original_amount)}</p>
        </div>
        <EntryStatusBadge status={entry.status} dueDate={entry.due_date} />
      </div>

      {installmentGroup && (
        <Card>
          <p className="text-sm text-ink-soft">
            Parcela <span className="font-medium text-ink">{entry.installment_number}</span> de{" "}
            <span className="font-medium text-ink">{entry.installment_total}</span> —{" "}
            {installmentGroup.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(siblings ?? []).map((s: any) => (
              <Link
                key={s.id}
                href={`${basePath}/${s.id}`}
                className={`rounded-full px-2.5 py-0.5 text-xs ${
                  s.id === entry.id ? "bg-brand-accentSoft text-brand-accent" : "bg-base-bg text-ink-soft hover:text-ink"
                }`}
              >
                {s.installment_number}/{entry.installment_total} · {formatDate(s.due_date)}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {recurringRule && (
        <Card>
          <p className="text-sm text-ink-soft">
            Gerado pela recorrência <span className="font-medium text-ink">{recurringRule.description}</span>.{" "}
            <Link href="/recorrencias" className="text-brand-accent hover:underline">
              Ver recorrência
            </Link>
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Dados do lançamento</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoRow label="Contraparte" value={(entry.counterparties as any)?.name} />
          <InfoRow label="Categoria" value={(entry.chart_account_categories as any)?.name} />
          <InfoRow label="Subcategoria" value={(entry.chart_account_subcategories as any)?.name} />
          <InfoRow label="Centro de custo" value={(entry.cost_centers as any)?.name} />
          <InfoRow label="Conta bancária prevista" value={(entry.bank_accounts as any)?.display_name} />
          <InfoRow label="Forma de pagamento" value={(entry.payment_methods as any)?.name} />
          <InfoRow label="Data de vencimento" value={formatDate(entry.due_date)} />
          <InfoRow label="Data de emissão" value={formatDate(entry.issue_date)} />
          <InfoRow label="Data de competência" value={formatDate(entry.competence_date)} />
          <InfoRow label="Nº do documento" value={entry.document_number} />
          {SETTLED_STATUSES.includes(entry.status) && (
            <InfoRow label="Saldo restante" value={formatCurrency(remainingBalance ?? entry.original_amount)} />
          )}
        </div>
        {entry.notes && (
          <div className="mt-4">
            <InfoRow label="Observações" value={<span className="whitespace-pre-wrap">{entry.notes}</span>} />
          </div>
        )}
      </Card>

      {canSettleNow && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">{actionLabel}</h2>
          <SettleForm
            entryId={entry.id}
            type={type}
            remainingBalance={remainingBalance ?? entry.original_amount}
            bankAccounts={(bankAccounts ?? []) as any}
            paymentMethods={paymentMethods ?? []}
            canPartial={canPartial}
          />
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Histórico de liquidações</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Data</th>
                <th className="py-2 pr-4 font-medium">Conta</th>
                <th className="py-2 pr-4 font-medium num">Valor</th>
                <th className="py-2 pr-4 font-medium">Encargos</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                {canCancel && <th className="py-2 pr-4 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {(settlements ?? []).map((s: any) => {
                const charges: string[] = [];
                if (s.interest > 0) charges.push(`Juros ${formatCurrency(s.interest)}`);
                if (s.penalty > 0) charges.push(`Multa ${formatCurrency(s.penalty)}`);
                if (s.addition > 0) charges.push(`Acréscimo ${formatCurrency(s.addition)}`);
                if (s.discount > 0) charges.push(`Desconto ${formatCurrency(s.discount)}`);

                return (
                  <tr key={s.id} className="border-b border-base-border last:border-0">
                    <td className="py-2 pr-4 text-ink-soft">{formatDate(s.settlement_date)}</td>
                    <td className="py-2 pr-4 text-ink-soft">{s.bank_accounts?.display_name}</td>
                    <td className="num py-2 pr-4 text-ink">{formatCurrency(s.amount)}</td>
                    <td className="py-2 pr-4 text-xs text-ink-faint">{charges.join(", ") || "—"}</td>
                    <td className="py-2 pr-4 text-ink-soft">{s.status === "valido" ? "Válida" : "Estornada"}</td>
                    {canCancel && (
                      <td className="py-2 pr-4">
                        {s.status === "valido" && <ReverseSettlementButton settlementId={s.id} />}
                      </td>
                    )}
                  </tr>
                );
              })}
              {(settlements ?? []).length === 0 && (
                <tr>
                  <td colSpan={canCancel ? 6 : 5} className="py-4 text-center text-ink-faint">
                    Nenhuma liquidação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Anexos</h2>
        <AttachmentsPanel
          entryId={entry.id}
          organizationId={entry.organization_id}
          attachments={attachments ?? []}
          canUpload={canAttach}
        />
      </Card>

      {canCancelNow && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Cancelamento</h2>
          <p className="mb-3 text-sm text-ink-soft">
            Só é possível cancelar antes de qualquer pagamento ou recebimento. Lançamentos já
            liquidados podem ter suas liquidações estornadas individualmente, acima.
          </p>
          <CancelForm entryId={entry.id} />
        </Card>
      )}
    </div>
  );
}
