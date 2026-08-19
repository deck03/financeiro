"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FREQUENCY_LABELS } from "@/lib/labels/parcelamento-recorrencia";
import { GenerateOccurrencesButton } from "./generate-occurrences-button";
import { CancelRecurringForm } from "./cancel-recurring-form";
import { EditRecurringForm } from "@/components/lancamentos/edit-recurring-form";

type Option = { id: string; name: string };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function RecurringRuleCard({
  rule: r,
  canManage,
  categories,
  subcategories,
  costCenters,
  bankAccounts,
  counterparties,
  paymentMethods,
}: {
  rule: {
    id: string;
    description: string;
    type: string;
    amount: number;
    frequency: string;
    interval_count: number;
    status: string;
    start_date: string;
    end_date: string | null;
    max_occurrences: number | null;
    adjust_business_day: boolean;
    competence_anchor_date: string | null;
    category_id: string;
    subcategory_id: string | null;
    cost_center_id: string | null;
    bank_account_id: string | null;
    counterparty_id: string | null;
    payment_method_id: string | null;
    upcomingEntries: { id: string; due_date: string; status: string }[];
  };
  canManage: boolean;
  categories: Option[];
  subcategories: (Option & { category_id: string })[];
  costCenters: Option[];
  bankAccounts: (Option & { ownership: string })[];
  counterparties: Option[];
  paymentMethods: Option[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{r.description}</h2>
          <p className="text-sm text-ink-soft">
            {r.type === "despesa" ? "Despesa" : "Receita"} · {FREQUENCY_LABELS[r.frequency]} ·{" "}
            <span className="num">{formatCurrency(r.amount)}</span> · início em {formatDate(r.start_date)}
            {r.end_date ? ` · até ${formatDate(r.end_date)}` : ""}
          </p>
        </div>
        <StatusBadge status={r.status === "ativa" ? "ativo" : "inativo"} />
      </div>

      {editing ? (
        <div className="mt-4">
          <EditRecurringForm
            rule={r}
            categories={categories}
            subcategories={subcategories}
            costCenters={costCenters}
            bankAccounts={bankAccounts}
            counterparties={counterparties}
            paymentMethods={paymentMethods}
            pendingCount={r.upcomingEntries.length}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
              Próximas ocorrências em aberto
            </p>
            {r.upcomingEntries.length === 0 ? (
              <p className="text-sm text-ink-faint">Nenhuma ocorrência em aberto no momento.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {r.upcomingEntries.slice(0, 8).map((e) => (
                  <li key={e.id} className="rounded-full bg-base-bg px-2.5 py-0.5 text-xs text-ink-soft">
                    {formatDate(e.due_date)}
                  </li>
                ))}
                {r.upcomingEntries.length > 8 && (
                  <li className="text-xs text-ink-faint">+{r.upcomingEntries.length - 8}</li>
                )}
              </ul>
            )}
          </div>

          {canManage && r.status === "ativa" && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-sm font-medium text-brand-accent hover:underline"
              >
                Editar
              </button>
              <GenerateOccurrencesButton ruleId={r.id} />
              <CancelRecurringForm ruleId={r.id} upcomingEntries={r.upcomingEntries} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
