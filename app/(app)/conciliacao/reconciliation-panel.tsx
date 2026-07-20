"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  reconcileWithExistingEntryAction,
  reconcileWithNewEntryAction,
  ignoreBankTransactionAction,
  type FormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const initialState: FormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

type OpenEntry = { id: string; description: string; remaining: number; due_date: string };
type Option = { id: string; name: string };

export function ReconciliationPanel({
  bankTransactionId,
  amount,
  description,
  openEntries,
  categories,
  subcategories,
  costCenters,
  counterparties,
  paymentMethods,
}: {
  bankTransactionId: string;
  amount: number;
  description: string;
  openEntries: OpenEntry[];
  categories: Option[];
  subcategories: (Option & { category_id: string })[];
  costCenters: Option[];
  counterparties: Option[];
  paymentMethods: Option[];
}) {
  const [mode, setMode] = useState<"closed" | "existing" | "new">("closed");
  const [isPending, startTransition] = useTransition();
  const [existingState, existingAction] = useFormState(reconcileWithExistingEntryAction, initialState);
  const [newState, newAction] = useFormState(reconcileWithNewEntryAction, initialState);
  const [selectedCategory, setSelectedCategory] = useState("");

  if (existingState.success || newState.success) {
    return <span className="text-xs text-ink-faint">Conciliada</span>;
  }

  if (mode === "closed") {
    return (
      <div className="flex gap-3">
        <button type="button" onClick={() => setMode("existing")} className="text-sm font-medium text-brand-accent hover:underline">
          Vincular a lançamento
        </button>
        <button type="button" onClick={() => setMode("new")} className="text-sm font-medium text-brand-accent hover:underline">
          Criar lançamento
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => ignoreBankTransactionAction(bankTransactionId))}
          className="text-sm font-medium text-ink-soft hover:underline disabled:opacity-50"
        >
          Ignorar
        </button>
      </div>
    );
  }

  if (mode === "existing") {
    const filteredEntries = openEntries;
    return (
      <form action={existingAction} className="space-y-2 rounded-card border border-base-border bg-base-bg p-3">
        <input type="hidden" name="bank_transaction_id" value={bankTransactionId} />
        <Select name="entry_id" required defaultValue="">
          <option value="" disabled>
            Selecione o lançamento em aberto
          </option>
          {filteredEntries.map((e) => (
            <option key={e.id} value={e.id}>
              {e.description} — restante {formatCurrency(e.remaining)}
            </option>
          ))}
        </Select>
        {filteredEntries.length === 0 && (
          <p className="text-xs text-ink-faint">Nenhum lançamento em aberto do tipo esperado para esta transação.</p>
        )}
        <div>
          <Label htmlFor={`amount-${bankTransactionId}`}>
            Valor a conciliar (deixe em branco para usar {formatCurrency(Math.abs(amount))})
          </Label>
          <Input id={`amount-${bankTransactionId}`} name="amount" type="number" step="0.01" min="0.01" />
        </div>
        {existingState.error && <p className="text-xs text-signal-negative">{existingState.error}</p>}
        <div className="flex gap-2">
          <SubmitButton label="Vincular" />
          <Button type="button" variant="ghost" onClick={() => setMode("closed")}>
            Voltar
          </Button>
        </div>
      </form>
    );
  }

  const filteredSubcategories = subcategories.filter((s) => s.category_id === selectedCategory);

  return (
    <form action={newAction} className="space-y-2 rounded-card border border-base-border bg-base-bg p-3">
      <input type="hidden" name="bank_transaction_id" value={bankTransactionId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor={`desc-${bankTransactionId}`}>Descrição</Label>
          <Input id={`desc-${bankTransactionId}`} name="description" defaultValue={description} />
        </div>
        <div>
          <Label htmlFor={`cat-${bankTransactionId}`}>Categoria</Label>
          <Select
            id={`cat-${bankTransactionId}`}
            name="category_id"
            required
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="" disabled>
              Selecione
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`subcat-${bankTransactionId}`}>Subcategoria (opcional)</Label>
          <Select id={`subcat-${bankTransactionId}`} name="subcategory_id" defaultValue="" disabled={filteredSubcategories.length === 0}>
            <option value="">Nenhuma</option>
            {filteredSubcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`cp-${bankTransactionId}`}>Contraparte (opcional)</Label>
          <Select id={`cp-${bankTransactionId}`} name="counterparty_id" defaultValue="">
            <option value="">Nenhuma</option>
            {counterparties.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`cc-${bankTransactionId}`}>Centro de custo (opcional)</Label>
          <Select id={`cc-${bankTransactionId}`} name="cost_center_id" defaultValue="">
            <option value="">Nenhum</option>
            {costCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`pm-${bankTransactionId}`}>Forma de pagamento (opcional)</Label>
          <Select id={`pm-${bankTransactionId}`} name="payment_method_id" defaultValue="">
            <option value="">Nenhuma</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {newState.error && <p className="text-xs text-signal-negative">{newState.error}</p>}

      <div className="flex gap-2">
        <SubmitButton label="Criar e conciliar" />
        <Button type="button" variant="ghost" onClick={() => setMode("closed")}>
          Voltar
        </Button>
      </div>
    </form>
  );
}
