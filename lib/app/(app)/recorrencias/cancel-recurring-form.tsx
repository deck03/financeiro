"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { cancelRecurringFormAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CANCEL_SCOPE_LABELS } from "@/lib/labels/parcelamento-recorrencia";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? "Cancelando..." : "Confirmar"}
    </Button>
  );
}

export function CancelRecurringForm({
  ruleId,
  upcomingEntries,
}: {
  ruleId: string;
  upcomingEntries: { id: string; due_date: string }[];
}) {
  const [state, formAction] = useFormState(cancelRecurringFormAction, initialState);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"uma" | "futuras" | "toda">("toda");

  if (state.success) {
    return <span className="text-xs text-ink-faint">Atualizado</span>;
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Cancelar ocorrências
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-card border border-base-border bg-base-bg p-4">
      <input type="hidden" name="rule_id" value={ruleId} />

      <div>
        <Select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} name="scope">
          {Object.entries(CANCEL_SCOPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {(scope === "uma" || scope === "futuras") && (
        <div>
          <Select name="from_entry_id" defaultValue="" required>
            <option value="" disabled>
              A partir de qual ocorrência?
            </option>
            {upcomingEntries.map((e) => (
              <option key={e.id} value={e.id}>
                {e.due_date.split("-").reverse().join("/")}
              </option>
            ))}
          </Select>
        </div>
      )}

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
