"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { cancelReceiptAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Cancelando..." : "Confirmar cancelamento"}
    </Button>
  );
}

export function CancelReceiptForm({ receiptId }: { receiptId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(cancelReceiptAction, initialState);

  if (state.success) {
    return <p className="text-sm text-signal-negative">Recibo cancelado.</p>;
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Cancelar recibo
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-card border border-signal-negative/30 bg-signal-negativeSoft/40 p-4">
      <input type="hidden" name="receipt_id" value={receiptId} />
      <p className="text-sm text-ink">
        O número deste recibo fica marcado como cancelado — ele não é reutilizado nem apagado.
        A liquidação de origem fica livre para receber um novo recibo, se precisar emitir de
        novo.
      </p>
      <div>
        <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
        <Input id="cancel-reason" name="reason" placeholder="Ex.: emitido com valor errado" />
      </div>
      {state.error && <p className="text-sm text-signal-negative">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Voltar
        </Button>
      </div>
    </form>
  );
}
