"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStatusButton } from "@/components/ui/toggle-status-button";
import { DeleteButton } from "@/components/cadastros/delete-button";
import { Input } from "@/components/ui/input";
import { updatePaymentMethodAction, togglePaymentMethodStatusAction, deletePaymentMethodAction, type FormState } from "./actions";

type PaymentMethod = { id: string; name: string; status: string };

const initialState: FormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs font-medium text-brand-accent hover:underline disabled:opacity-50">
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

export function PaymentMethodRow({ method, canEdit }: { method: PaymentMethod; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updatePaymentMethodAction, initialState);

  if (editing) {
    return (
      <tr className="border-b border-base-border last:border-0">
        <td colSpan={3} className="py-2 pr-4">
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={method.id} />
            <Input name="name" defaultValue={method.name} className="w-56" />
            <SaveButton />
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-ink-faint hover:underline">
              Cancelar
            </button>
            {state.error && <span className="text-xs text-signal-negative">{state.error}</span>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-base-border last:border-0">
      <td className="py-2 pr-4 text-ink">{method.name}</td>
      <td className="py-2 pr-4">
        <StatusBadge status={method.status} />
      </td>
      {canEdit && (
        <td className="py-2 pr-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-brand-accent hover:underline">
              Editar
            </button>
            <ToggleStatusButton
              isActive={method.status === "ativo"}
              action={togglePaymentMethodStatusAction.bind(null, method.id, method.status)}
            />
            <DeleteButton action={deletePaymentMethodAction.bind(null, method.id)} itemLabel={method.name} />
          </div>
        </td>
      )}
    </tr>
  );
}
