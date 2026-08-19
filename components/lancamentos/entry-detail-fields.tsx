"use client";

import { useState } from "react";
import { EditEntryForm } from "./edit-entry-form";

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

export function EntryDetailFields({
  entry,
  displayValues,
  remainingBalance,
  canEditNow,
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
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div>
      {canEditNow && (
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-brand-accent hover:underline">
            Editar
          </button>
        </div>
      )}
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
