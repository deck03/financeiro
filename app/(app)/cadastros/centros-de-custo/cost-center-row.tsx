"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStatusButton } from "@/components/ui/toggle-status-button";
import { DeleteButton } from "@/components/cadastros/delete-button";
import { Input } from "@/components/ui/input";
import { updateCostCenterAction, toggleCostCenterStatusAction, setDefaultCostCenterAction, deleteCostCenterAction, type FormState } from "./actions";

type CostCenter = { id: string; name: string; code: string | null; status: string; is_default: boolean };

const initialState: FormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs font-medium text-brand-accent hover:underline disabled:opacity-50">
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

export function CostCenterRow({ costCenter, canEdit }: { costCenter: CostCenter; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateCostCenterAction, initialState);

  if (editing) {
    return (
      <tr className="border-b border-base-border last:border-0">
        <td colSpan={4} className="py-2 pr-4">
          <form
            action={(fd) => {
              formAction(fd);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="id" value={costCenter.id} />
            <Input name="name" defaultValue={costCenter.name} className="w-56" />
            <Input name="code" defaultValue={costCenter.code ?? ""} placeholder="Código (opcional)" className="w-32" />
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
      <td className="py-2 pr-4 text-ink">{costCenter.name}</td>
      <td className="py-2 pr-4 text-ink-soft">
        {costCenter.is_default ? (
          <span className="text-brand-accent">Padrão</span>
        ) : canEdit ? (
          <ToggleStatusButton
            isActive={false}
            activeLabel="Definir como padrão"
            inactiveLabel="Definir como padrão"
            action={setDefaultCostCenterAction.bind(null, costCenter.id)}
          />
        ) : (
          "—"
        )}
      </td>
      <td className="py-2 pr-4">
        <StatusBadge status={costCenter.status} />
      </td>
      {canEdit && (
        <td className="py-2 pr-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-brand-accent hover:underline">
              Editar
            </button>
            <ToggleStatusButton
              isActive={costCenter.status === "ativo"}
              action={toggleCostCenterStatusAction.bind(null, costCenter.id, costCenter.status)}
            />
            <DeleteButton action={deleteCostCenterAction.bind(null, costCenter.id)} itemLabel={costCenter.name} />
          </div>
        </td>
      )}
    </tr>
  );
}
