"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStatusButton } from "@/components/ui/toggle-status-button";
import { DeleteButton } from "@/components/cadastros/delete-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { updateSubcategoryAction, toggleSubcategoryStatusAction, deleteSubcategoryAction, type FormState } from "./actions";

type Subcategory = {
  id: string;
  name: string;
  status: string;
  category_id: string;
  chart_account_categories?: { name: string } | null;
};

const initialState: FormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs font-medium text-brand-accent hover:underline disabled:opacity-50">
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

export function SubcategoryRow({
  subcategory: s,
  categories,
  canEdit,
}: {
  subcategory: Subcategory;
  categories: { id: string; name: string; family_name: string }[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateSubcategoryAction, initialState);

  if (editing) {
    return (
      <tr className="border-b border-base-border last:border-0">
        <td colSpan={4} className="py-2 pr-4">
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={s.id} />
            <Input name="name" defaultValue={s.name} className="w-48" />
            <Select name="category_id" defaultValue={s.category_id} className="w-56">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.family_name} — {c.name}
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
      <td className="py-2 pr-4 text-ink">{s.name}</td>
      <td className="py-2 pr-4 text-ink-soft">{s.chart_account_categories?.name}</td>
      <td className="py-2 pr-4">
        <StatusBadge status={s.status} />
      </td>
      {canEdit && (
        <td className="py-2 pr-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-brand-accent hover:underline">
              Editar
            </button>
            <ToggleStatusButton isActive={s.status === "ativo"} action={toggleSubcategoryStatusAction.bind(null, s.id, s.status)} />
            <DeleteButton action={deleteSubcategoryAction.bind(null, s.id)} itemLabel={s.name} />
          </div>
        </td>
      )}
    </tr>
  );
}
