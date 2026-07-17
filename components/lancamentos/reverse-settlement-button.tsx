"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { reverseSettlementFormAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? "Estornando..." : "Confirmar estorno"}
    </Button>
  );
}

export function ReverseSettlementButton({ settlementId }: { settlementId: string }) {
  const [state, formAction] = useFormState(reverseSettlementFormAction, initialState);
  const [confirming, setConfirming] = useState(false);

  if (state.success) {
    return <span className="text-xs text-ink-faint">Estornada</span>;
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-signal-negative hover:underline"
      >
        Estornar
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-card border border-base-border bg-base-bg p-3">
      <input type="hidden" name="settlement_id" value={settlementId} />
      <Label htmlFor={`reason-${settlementId}`}>Motivo (opcional)</Label>
      <Input id={`reason-${settlementId}`} name="reason" />
      {state.error && <p className="text-xs text-signal-negative">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
          Voltar
        </Button>
      </div>
    </form>
  );
}
