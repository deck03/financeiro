"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createTransferAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TRANSFER_CLASSIFICATION_LABELS } from "@/lib/labels/transferencias";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Registrar transferência"}
    </Button>
  );
}

export function NewTransferForm({
  bankAccounts,
}: {
  bankAccounts: { id: string; name: string; ownership: string }[];
}) {
  const [state, formAction] = useFormState(createTransferAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="t-from">Conta de origem</Label>
          <Select id="t-from" name="from_bank_account_id" required defaultValue="">
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
          <Label htmlFor="t-to">Conta de destino</Label>
          <Select id="t-to" name="to_bank_account_id" required defaultValue="">
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
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="t-amount">Valor</Label>
          <Input id="t-amount" name="amount" type="number" step="0.01" min="0.01" required />
        </div>
        <div>
          <Label htmlFor="t-date">Data</Label>
          <Input id="t-date" name="transfer_date" type="date" defaultValue={today} required />
        </div>
        <div>
          <Label htmlFor="t-classification">Classificação</Label>
          <Select id="t-classification" name="classification" defaultValue="transferencia_interna" required>
            {Object.entries(TRANSFER_CLASSIFICATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <p className="text-xs text-ink-faint">
        Transferências entre uma conta empresarial e uma conta pessoal exigem uma classificação
        específica (não pode ser "transferência interna").
      </p>

      <div>
        <Label htmlFor="t-notes">Observações (opcional)</Label>
        <Input id="t-notes" name="notes" />
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-card bg-signal-positiveSoft px-3 py-2 text-sm text-signal-positive">
          Transferência registrada.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
