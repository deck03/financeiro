"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStatusButton } from "@/components/ui/toggle-status-button";
import { DeleteButton } from "@/components/cadastros/delete-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FAMILY_TYPE_LABELS } from "@/lib/labels/plano-de-contas";
import { updateFamilyAction, toggleFamilyStatusAction, deleteFamilyAction, type FormState } from "./actions";

type Family = { id: string; name: string; code: string | null; type: string; status: string };
const initialState: FormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs font-medium text-brand-accent hover:underline disabled:opacity-50">
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

export function FamilyRow({ family: f, canEdit }: { family: Family; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateFamilyAction, initialState);

  if (editing) {
    return (
      <tr className="border-b border-base-border last:border-0">
        <td colSpan={4} className="py-2 pr-4">
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={f.id} />
            <Input name="name" defaultValue={f.name} className="w-48" />
            <Select name="type" defaultValue={f.type} className="w-40">
              {Object.entries(FAMILY_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
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
      <td className="py-2 pr-4 text-ink">{f.name}</td>
      <td className="py-2 pr-4 text-ink-soft">{FAMILY_TYPE_LABELS[f.type]}</td>
      <td className="py-2 pr-4">
        <StatusBadge status={f.status} />
      </td>
      {canEdit && (
        <td className="py-2 pr-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-brand-accent hover:underline">
              Editar
            </button>
            <ToggleStatusButton isActive={f.status === "ativo"} action={toggleFamilyStatusAction.bind(null, f.id, f.status)} />
            <DeleteButton action={deleteFamilyAction.bind(null, f.id)} itemLabel={f.name} />
          </div>
        </td>
      )}
    </tr>
  );
}
