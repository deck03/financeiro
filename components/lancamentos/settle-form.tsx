"use client";

import { useFormState, useFormStatus } from "react-dom";
import { settleEntryFormAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const initialState: FormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : label}
    </Button>
  );
}

export function SettleForm({
  entryId,
  type,
  bankAccounts,
  paymentMethods,
}: {
  entryId: string;
  type: "receita" | "despesa";
  bankAccounts: { id: string; name: string; ownership: string }[];
  paymentMethods: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(settleEntryFormAction, initialState);
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

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}

      <SubmitButton label={label} />
    </form>
  );
}
