"use client";

import { useFormState, useFormStatus } from "react-dom";
import { generateReceiptAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Gerando recibo..." : "Gerar recibo em PDF"}
    </Button>
  );
}

export function NewReceiptForm({ settlementId }: { settlementId: string }) {
  const [state, formAction] = useFormState(generateReceiptAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="settlement_id" value={settlementId} />

      <div>
        <Label htmlFor="reference_period">Período de referência (opcional)</Label>
        <Input id="reference_period" name="reference_period" placeholder="Ex.: Julho/2026" />
      </div>
      <div>
        <Label htmlFor="space_description">Descrição do espaço alugado (opcional)</Label>
        <Input id="space_description" name="space_description" placeholder="Ex.: Quadra 2 — período noturno" />
      </div>
      <div>
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Input id="notes" name="notes" />
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
