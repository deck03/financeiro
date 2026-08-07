"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { settleEntryFormAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const initialState: FormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : label}
    </Button>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function SettleForm({
  entryId,
  type,
  remainingBalance,
  bankAccounts,
  paymentMethods,
  canPartial,
}: {
  entryId: string;
  type: "receita" | "despesa";
  remainingBalance: number;
  bankAccounts: { id: string; name: string; ownership: string }[];
  paymentMethods: { id: string; name: string }[];
  canPartial: boolean;
}) {
  const [state, formAction] = useFormState(settleEntryFormAction, initialState);
  const [showCharges, setShowCharges] = useState(false);
  const [isPartial, setIsPartial] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const label = type === "despesa" ? "Registrar pagamento" : "Registrar recebimento";

  if (state.success) {
    return (
      <p className="rounded-card bg-signal-positiveSoft px-3 py-2 text-sm text-signal-positive">
        {type === "despesa" ? "Pagamento registrado." : "Recebimento registrado."}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="entry_id" value={entryId} />
      <p className="text-sm text-ink-soft">
        Saldo restante: <span className="num font-medium text-ink">{formatCurrency(remainingBalance)}</span>
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="s-date">Data</Label>
          <Input id="s-date" name="settlement_date" type="date" defaultValue={today} required />
        </div>
        <div>
          <Label htmlFor="s-account">Conta bancária</Label>
          <Select id="s-account" name="bank_account_id" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.ownership === "pessoa_fisica" ? "(pessoal)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="s-method">Forma de pagamento (opcional)</Label>
          <Select id="s-method" name="payment_method_id" defaultValue="">
            <option value="">Nenhuma</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {canPartial && (
        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox checked={isPartial} onChange={(e) => setIsPartial(e.target.checked)} />
          Liquidar apenas parte do valor
        </label>
      )}

      {isPartial && (
        <div>
          <Label htmlFor="s-amount">Valor a liquidar agora</Label>
          <Input id="s-amount" name="amount" type="number" step="0.01" min="0.01" max={remainingBalance} required />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-ink">
        <Checkbox checked={showCharges} onChange={(e) => setShowCharges(e.target.checked)} />
        Incluir juros, multa, desconto ou acréscimo
      </label>

      {showCharges && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="s-interest">Juros</Label>
            <Input id="s-interest" name="interest" type="number" step="0.01" min="0" defaultValue="0" />
          </div>
          <div>
            <Label htmlFor="s-penalty">Multa</Label>
            <Input id="s-penalty" name="penalty" type="number" step="0.01" min="0" defaultValue="0" />
          </div>
          <div>
            <Label htmlFor="s-addition">Acréscimo</Label>
            <Input id="s-addition" name="addition" type="number" step="0.01" min="0" defaultValue="0" />
          </div>
          <div>
            <Label htmlFor="s-discount">Desconto</Label>
            <Input id="s-discount" name="discount" type="number" step="0.01" min="0" defaultValue="0" />
          </div>
        </div>
      )}

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}

      <SubmitButton label={label} />
    </form>
  );
}
