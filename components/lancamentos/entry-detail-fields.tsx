"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { EditEntryForm } from "./edit-entry-form";
import { updateEntryStatusAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Select } from "@/components/ui/select";

// Rótulos só para os três status que este seletor manipula — definidos
// localmente para não depender de um arquivo de labels externo que não
// foi conferido nesta mudança.
const OPEN_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  em_aberto: "Em aberto",
  agendado: "Agendado",
};

type Option = { id: string; name: string };

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

const OPEN_BUCKET_STATUSES = ["rascunho", "em_aberto", "agendado"];
const statusInitialState: FormState = {};

/**
 * Troca o status entre rascunho / em aberto / agendado, sem passar por
 * liquidação nem cancelamento — só aparece enquanto o lançamento ainda
 * está nesse grupo "em aberto". Uma vez pago/recebido/cancelado, a
 * mudança de status exige o fluxo próprio (estornar, editar liquidação
 * etc.), não esse seletor simples.
 */
function StatusChanger({ entryId, currentStatus }: { entryId: string; currentStatus: string }) {
  const [state, formAction] = useFormState(updateEntryStatusAction, statusInitialState);
  const { pending } = useFormStatus();

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="entry_id" value={entryId} />
      <Select
        name="status"
        defaultValue={currentStatus}
        onChange={(e) => e.target.form?.requestSubmit()}
        disabled={pending}
        className="w-40"
      >
        {OPEN_BUCKET_STATUSES.map((s) => (
          <option key={s} value={s}>
            {OPEN_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      {state.error && <span className="text-xs text-signal-negative">{state.error}</span>}
      {state.success && <span className="text-xs text-signal-positive">Status atualizado.</span>}
    </form>
  );
}

export function EntryDetailFields({
  entry,
  displayValues,
  remainingBalance,
  canEditNow,
  hasSettlement,
  categories,
  subcategories,
  costCenters,
  bankAccounts,
  counterparties,
  paymentMethods,
}: {
  entry: {
    id: string;
    description: string;
    original_amount: number;
    due_date: string;
    issue_date: string | null;
    competence_date: string | null;
    document_number: string | null;
    notes: string | null;
    category_id: string | null;
    subcategory_id: string | null;
    cost_center_id: string | null;
    bank_account_id: string | null;
    counterparty_id: string | null;
    payment_method_id: string | null;
    status: string;
  };
  displayValues: {
    counterparty?: string;
    category?: string;
    subcategory?: string;
    costCenter?: string;
    bankAccount?: string;
    paymentMethod?: string;
  };
  remainingBalance: number | null;
  canEditNow: boolean;
  hasSettlement: boolean;
  categories: Option[];
  subcategories: (Option & { category_id: string })[];
  costCenters: Option[];
  bankAccounts: (Option & { ownership: string })[];
  counterparties: Option[];
  paymentMethods: Option[];
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EditEntryForm
        entry={entry}
        categories={categories}
        subcategories={subcategories}
        costCenters={costCenters}
        bankAccounts={bankAccounts}
        counterparties={counterparties}
        paymentMethods={paymentMethods}
        hasSettlement={hasSettlement}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {canEditNow && OPEN_BUCKET_STATUSES.includes(entry.status) ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">Status</p>
            <StatusChanger entryId={entry.id} currentStatus={entry.status} />
          </div>
        ) : (
          <span />
        )}
        {canEditNow && (
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-brand-accent hover:underline">
            Editar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoRow label="Contraparte" value={displayValues.counterparty} />
        <InfoRow label="Categoria" value={displayValues.category} />
        <InfoRow label="Subcategoria" value={displayValues.subcategory} />
        <InfoRow label="Centro de custo" value={displayValues.costCenter} />
        <InfoRow label="Conta bancária prevista" value={displayValues.bankAccount} />
        <InfoRow label="Forma de pagamento" value={displayValues.paymentMethod} />
        <InfoRow label="Data de vencimento" value={formatDate(entry.due_date)} />
        <InfoRow label="Data de emissão" value={formatDate(entry.issue_date)} />
        <InfoRow label="Data de competência" value={formatDate(entry.competence_date)} />
        <InfoRow label="Nº do documento" value={entry.document_number} />
        {remainingBalance !== null && <InfoRow label="Saldo restante" value={formatCurrency(remainingBalance)} />}
      </div>
      {entry.notes && (
        <div className="mt-4">
          <InfoRow label="Observações" value={<span className="whitespace-pre-wrap">{entry.notes}</span>} />
        </div>
      )}
    </div>
  );
}
