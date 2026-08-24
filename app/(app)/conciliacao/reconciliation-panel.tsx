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

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
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

type OpenEntry = { id: string; description: string; remaining: number; due_date: string; competence_date: string | null };
type Option = { id: string; name: string };
type CategoryOption = Option & { type: string };
type Suggestion = {
  categoryId: string | null;
  subcategoryId: string | null;
  costCenterId: string | null;
  counterpartyId: string | null;
  paymentMethodId: string | null;
  sourceDescription: string;
};

export function ReconciliationPanel({
  bankTransactionId,
  amount,
  description,
  transactionDate,
  openEntries,
  categories,
  subcategories,
  costCenters,
  counterparties,
  paymentMethods,
  suggestion,
}: {
  bankTransactionId: string;
  amount: number;
  description: string;
  transactionDate: string;
  openEntries: OpenEntry[];
  categories: CategoryOption[];
  subcategories: (Option & { category_id: string })[];
  costCenters: Option[];
  counterparties: Option[];
  paymentMethods: Option[];
  suggestion?: Suggestion | null;
}) {
  const [mode, setMode] = useState<"closed" | "existing" | "new">("closed");
  const [isPending, startTransition] = useTransition();
  const [existingState, existingAction] = useFormState(reconcileWithExistingEntryAction, initialState);
  const [newState, newAction] = useFormState(reconcileWithNewEntryAction, initialState);
  // Já abre com a categoria sugerida marcada (quando existe), para as
  // subcategorias filtrarem certo assim que o formulário aparece.
  const [selectedCategory, setSelectedCategory] = useState(suggestion?.categoryId ?? "");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  // Valor digitado no campo "Valor a conciliar" — precisa ser controlado
  // para comparar com o saldo restante do lançamento escolhido e decidir
  // se mostra a escolha de liquidação parcial vs. total.
  const [amountInput, setAmountInput] = useState("");
  const [settleChoice, setSettleChoice] = useState<"parcial" | "total">("parcial");

  if (existingState.success || newState.success) {
    return <span className="text-xs text-ink-faint">Conciliada</span>;
  }

  if (mode === "closed") {
    return (
      <div className="flex flex-wrap items-center gap-3">
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
        {suggestion && (
          <span className="text-xs text-ink-faint">
            Sugestão disponível de &quot;{categories.find((c) => c.id === suggestion.categoryId)?.name ?? "uma classificação anterior"}&quot;
          </span>
        )}
      </div>
    );
  }

  if (mode === "existing") {
    const filteredEntries = openEntries;
    const selected = filteredEntries.find((e) => e.id === selectedEntryId);

    // Valor que de fato vai ser considerado se o campo "Valor a conciliar"
    // ficar em branco (mesma regra usada no servidor: usa o valor da
    // própria transação bancária).
    const effectiveAmount = amountInput !== "" ? Number(amountInput) : Math.abs(amount);
    // Diferença de 1 centavo é tolerada (arredondamento) — só considera
    // "valor diferente" acima disso.
    const amountDiffers =
      selected !== undefined && !Number.isNaN(effectiveAmount) && Math.abs(effectiveAmount - selected.remaining) > 0.01;

    return (
      <form action={existingAction} className="space-y-2 rounded-card border border-base-border bg-base-bg p-3">
        <input type="hidden" name="bank_transaction_id" value={bankTransactionId} />
        <input type="hidden" name="mark_as_fully_settled" value={amountDiffers && settleChoice === "total" ? "on" : ""} />
        <Select
          name="entry_id"
          required
          value={selectedEntryId}
          onChange={(e) => {
            setSelectedEntryId(e.target.value);
            setSettleChoice("parcial");
          }}
        >
          <option value="" disabled>
            Selecione o lançamento em aberto
          </option>
          {filteredEntries.map((e) => {
            const venc = formatDate(e.due_date);
            const comp = formatDate(e.competence_date);
            return (
              <option key={e.id} value={e.id}>
                {e.description} — venc. {venc ?? "—"}
                {comp ? ` · comp. ${comp}` : ""} — restante {formatCurrency(e.remaining)}
              </option>
            );
          })}
        </Select>
        {selected && (
          <p className="text-xs text-ink-soft">
            Vencimento: <span className="font-medium text-ink">{formatDate(selected.due_date) ?? "—"}</span>
            {" · "}
            Competência:{" "}
            <span className="font-medium text-ink">{formatDate(selected.competence_date) ?? "não informada"}</span>
          </p>
        )}
        {filteredEntries.length === 0 && (
          <p className="text-xs text-ink-faint">Nenhum lançamento em aberto do tipo esperado para esta transação.</p>
        )}
        <div>
          <Label htmlFor={`amount-${bankTransactionId}`}>
            Valor a conciliar (deixe em branco para usar {formatCurrency(Math.abs(amount))})
          </Label>
          <Input
            id={`amount-${bankTransactionId}`}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
          />
        </div>

        {amountDiffers && selected && (
          <div className="rounded-card border border-brand-accent/40 bg-brand-accentSoft p-3 text-sm">
            <p className="text-ink">
              O valor ({formatCurrency(effectiveAmount)}) é diferente do saldo restante deste lançamento (
              {formatCurrency(selected.remaining)}). Comum quando o valor de uma conta recorrente varia um pouco a
              cada mês. Como você quer tratar isso?
            </p>
            <div className="mt-2 space-y-1.5">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="_settle_choice_ui"
                  checked={settleChoice === "parcial"}
                  onChange={() => setSettleChoice("parcial")}
                  className="mt-0.5"
                />
                <span className="text-ink">
                  <span className="font-medium">Liquidação parcial</span> — grava exatamente{" "}
                  {formatCurrency(effectiveAmount)}; o lançamento fica em aberto pela diferença.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="_settle_choice_ui"
                  checked={settleChoice === "total"}
                  onChange={() => setSettleChoice("total")}
                  className="mt-0.5"
                />
                <span className="text-ink">
                  <span className="font-medium">Considerar totalmente liquidado</span> — fecha o lançamento por
                  completo, mesmo com o valor diferente. O valor real da transação bancária continua registrado no
                  extrato, para conferência.
                </span>
              </label>
            </div>
          </div>
        )}

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
  // Mesma regra usada no resto do sistema: valor negativo = despesa, valor
  // positivo = receita. Categorias marcadas como "ambos" aparecem nos dois
  // casos; as demais só aparecem para o tipo correspondente.
  const relevantType = amount >= 0 ? "receita" : "despesa";
  const filteredCategories = categories.filter((c) => c.type === relevantType || c.type === "ambos");

  return (
    <form action={newAction} className="space-y-2 rounded-card border border-base-border bg-base-bg p-3">
      <input type="hidden" name="bank_transaction_id" value={bankTransactionId} />
      {suggestion && (
        <p className="rounded-card bg-brand-accentSoft px-2 py-1.5 text-xs text-brand-accent">
          Campos preenchidos a partir de uma transação parecida, classificada antes como
          &quot;{suggestion.sourceDescription}&quot;. Confira e ajuste se não for o caso.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor={`desc-${bankTransactionId}`}>Descrição</Label>
          <Input id={`desc-${bankTransactionId}`} name="description" defaultValue={description} />
        </div>
        <div>
          <Label htmlFor={`comp-${bankTransactionId}`}>Data de competência</Label>
          <Input
            id={`comp-${bankTransactionId}`}
            name="competence_date"
            type="date"
            defaultValue={transactionDate}
          />
          <p className="mt-1 text-xs text-ink-faint">
            Já vem com a data da transação — mude se o mês de referência for outro (ex.: conta
            paga em atraso).
          </p>
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
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`subcat-${bankTransactionId}`}>Subcategoria (opcional)</Label>
          <Select
            id={`subcat-${bankTransactionId}`}
            name="subcategory_id"
            defaultValue={suggestion?.subcategoryId ?? ""}
            disabled={filteredSubcategories.length === 0}
          >
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
          <Select id={`cp-${bankTransactionId}`} name="counterparty_id" defaultValue={suggestion?.counterpartyId ?? ""}>
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
          <Select id={`cc-${bankTransactionId}`} name="cost_center_id" defaultValue={suggestion?.costCenterId ?? ""}>
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
          <Select id={`pm-${bankTransactionId}`} name="payment_method_id" defaultValue={suggestion?.paymentMethodId ?? ""}>
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
