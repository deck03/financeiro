"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { cancelEntryFormAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? "Cancelando..." : "Confirmar cancelamento"}
    </Button>
  );
}

export function CancelForm({ entryId }: { entryId: string }) {
  const [state, formAction] = useFormState(cancelEntryFormAction, initialState);
  const [confirming, setConfirming] = useState(false);

  if (state.success) {
    return (
      <p className="rounded-card bg-base-bg px-3 py-2 text-sm text-ink-soft">
        Lançamento cancelado.
      </p>
    );
  }

  if (!confirming) {
    return (
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        Cancelar lançamento
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-card border border-base-border bg-base-bg p-4">
      <input type="hidden" name="entry_id" value={entryId} />
      <p className="text-sm text-ink">
        Tem certeza que deseja cancelar este lançamento? Esta ação não pode ser desfeita pela
        interface.
      </p>
      <div>
        <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
        <Input id="cancel-reason" name="reason" />
      </div>
      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
          Voltar
        </Button>
      </div>
    </form>
  );
}
