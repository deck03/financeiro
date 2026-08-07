"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateInitialBalanceAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Salvando..." : "Salvar saldo inicial"}
    </Button>
  );
}

export function EditInitialBalanceForm({
  bankAccountId,
  currentBalance,
  currentDate,
}: {
  bankAccountId: string;
  currentBalance: number;
  currentDate: string;
}) {
  const [state, formAction] = useFormState(updateInitialBalanceAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="bank_account_id" value={bankAccountId} />
      <div>
        <Label htmlFor="ib-balance">Saldo inicial</Label>
        <Input id="ib-balance" name="initial_balance" type="number" step="0.01" defaultValue={currentBalance} />
      </div>
      <div>
        <Label htmlFor="ib-date">Data do saldo inicial</Label>
        <Input id="ib-date" name="initial_balance_date" type="date" defaultValue={currentDate} required />
      </div>
      <SubmitButton />
      {state.error && <p className="text-sm text-signal-negative">{state.error}</p>}
      {state.success && <p className="text-sm text-signal-positive">Saldo inicial atualizado.</p>}
    </form>
  );
}
