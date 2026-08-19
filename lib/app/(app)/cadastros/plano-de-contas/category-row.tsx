"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStatusButton } from "@/components/ui/toggle-status-button";
import { DeleteButton } from "@/components/cadastros/delete-button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORY_TYPE_LABELS, MANAGERIAL_NATURE_LABELS, DRE_BEHAVIOR_LABELS, CASHFLOW_BEHAVIOR_LABELS } from "@/lib/labels/plano-de-contas";
import { updateCategoryAction, toggleCategoryStatusAction, deleteCategoryAction, type FormState } from "./actions";

type Category = {
  id: string;
  name: string;
  status: string;
  type: string;
  managerial_nature: string;
  dre_behavior: string;
  cashflow_behavior: string;
  family_id: string;
  chart_account_families?: { name: string } | null;
};

const initialState: FormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-card bg-brand-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

export function CategoryRow({
  category: c,
  families,
  canEdit,
}: {
  category: Category;
  families: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateCategoryAction, initialState);

  if (editing) {
    return (
      <tr className="border-b border-base-border last:border-0">
        <td colSpan={8} className="py-3 pr-4">
          <form action={formAction} className="space-y-3 rounded-card border border-base-border bg-base-bg p-3">
            <input type="hidden" name="id" value={c.id} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor={`ec-name-${c.id}`}>Nome</Label>
                <Input id={`ec-name-${c.id}`} name="name" defaultValue={c.name} required />
              </div>
              <div>
                <Label htmlFor={`ec-family-${c.id}`}>Família</Label>
                <Select id={`ec-family-${c.id}`} name="family_id" defaultValue={c.family_id}>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`ec-type-${c.id}`}>Tipo</Label>
                <Select id={`ec-type-${c.id}`} name="type" defaultValue={c.type}>
                  {Object.entries(CATEGORY_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`ec-nature-${c.id}`}>Natureza gerencial</Label>
                <Select id={`ec-nature-${c.id}`} name="managerial_nature" defaultValue={c.managerial_nature}>
                  {Object.entries(MANAGERIAL_NATURE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`ec-dre-${c.id}`}>Comportamento na DRE</Label>
                <Select id={`ec-dre-${c.id}`} name="dre_behavior" defaultValue={c.dre_behavior}>
                  {Object.entries(DRE_BEHAVIOR_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`ec-cf-${c.id}`}>Comportamento no fluxo de caixa</Label>
                <Select id={`ec-cf-${c.id}`} name="cashflow_behavior" defaultValue={c.cashflow_behavior}>
                  {Object.entries(CASHFLOW_BEHAVIOR_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {state.error && <p className="text-xs text-signal-negative">{state.error}</p>}
            <div className="flex gap-2">
              <SaveButton />
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-ink-faint hover:underline">
                Cancelar
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-base-border last:border-0">
      <td className="py-2 pr-4 text-ink">{c.name}</td>
      <td className="py-2 pr-4 text-ink-soft">{c.chart_account_families?.name}</td>
      <td className="py-2 pr-4">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            c.type === "despesa"
              ? "bg-signal-negativeSoft text-signal-negative"
              : c.type === "receita"
                ? "bg-signal-positiveSoft text-signal-positive"
                : "bg-base-bg text-ink-soft"
          }`}
        >
          {CATEGORY_TYPE_LABELS[c.type]}
        </span>
      </td>
      <td className="py-2 pr-4 text-ink-soft">{MANAGERIAL_NATURE_LABELS[c.managerial_nature]}</td>
      <td className="py-2 pr-4 text-ink-soft">{DRE_BEHAVIOR_LABELS[c.dre_behavior]}</td>
      <td className="py-2 pr-4 text-ink-soft">{CASHFLOW_BEHAVIOR_LABELS[c.cashflow_behavior]}</td>
      <td className="py-2 pr-4">
        <StatusBadge status={c.status} />
      </td>
      {canEdit && (
        <td className="py-2 pr-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-brand-accent hover:underline">
              Editar
            </button>
            <ToggleStatusButton isActive={c.status === "ativo"} action={toggleCategoryStatusAction.bind(null, c.id, c.status)} />
            <DeleteButton action={deleteCategoryAction.bind(null, c.id)} itemLabel={c.name} />
          </div>
        </td>
      )}
    </tr>
  );
}
