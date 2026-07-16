"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createBalanceSnapshotAction } from "@/app/(app)/cadastros/contas-bancarias/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type FormState = { error?: string; success?: boolean };
const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : "Registrar conferência"}
    </Button>
  );
}

export function BalanceSnapshotForm({ bankAccountId }: { bankAccountId: string }) {
  const [state, formAction] = useFormState(createBalanceSnapshotAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="bank_account_id" value={bankAccountId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="snap-date">Data da conferência</Label>
          <Input id="snap-date" name="snapshot_date" type="date" defaultValue={today} required />
        </div>
        <div>
          <Label htmlFor="snap-balance">Saldo informado pelo banco</Label>
          <Input id="snap-balance" name="informed_balance" type="number" step="0.01" required />
        </div>
        <div>
          <Label htmlFor="snap-notes">Observações (opcional)</Label>
          <Input id="snap-notes" name="notes" />
        </div>
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-card bg-signal-positiveSoft px-3 py-2 text-sm text-signal-positive">
          Conferência registrada.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
