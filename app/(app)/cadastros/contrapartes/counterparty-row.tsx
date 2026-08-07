"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStatusButton } from "@/components/ui/toggle-status-button";
import { DeleteButton } from "@/components/cadastros/delete-button";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { COUNTERPARTY_TYPE_LABELS } from "@/lib/labels/contrapartes";
import { updateCounterpartyAction, toggleCounterpartyStatusAction, deleteCounterpartyAction, type FormState } from "./actions";

type Counterparty = {
  id: string;
  name: string;
  trade_name: string | null;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  types: string[];
  notes: string | null;
  status: string;
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

export function CounterpartyRow({ counterparty: c, canEdit }: { counterparty: Counterparty; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateCounterpartyAction, initialState);

  if (editing) {
    return (
      <tr className="border-b border-base-border last:border-0">
        <td colSpan={6} className="py-3 pr-4">
          <form action={formAction} className="space-y-3 rounded-card border border-base-border bg-base-bg p-3">
            <input type="hidden" name="id" value={c.id} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor={`e-name-${c.id}`}>Nome ou razão social</Label>
                <Input id={`e-name-${c.id}`} name="name" defaultValue={c.name} required />
              </div>
              <div>
                <Label htmlFor={`e-trade-${c.id}`}>Nome fantasia</Label>
                <Input id={`e-trade-${c.id}`} name="trade_name" defaultValue={c.trade_name ?? ""} />
              </div>
              <div>
                <Label htmlFor={`e-doc-${c.id}`}>CPF ou CNPJ</Label>
                <Input id={`e-doc-${c.id}`} name="document_number" defaultValue={c.document_number ?? ""} />
              </div>
              <div>
                <Label htmlFor={`e-email-${c.id}`}>E-mail</Label>
                <Input id={`e-email-${c.id}`} name="email" type="email" defaultValue={c.email ?? ""} />
              </div>
              <div>
                <Label htmlFor={`e-phone-${c.id}`}>Telefone</Label>
                <Input id={`e-phone-${c.id}`} name="phone" defaultValue={c.phone ?? ""} />
              </div>
              <div>
                <Label htmlFor={`e-address-${c.id}`}>Endereço</Label>
                <Input id={`e-address-${c.id}`} name="address" defaultValue={c.address ?? ""} />
              </div>
            </div>
            <div>
              <Label>Tipos de contraparte</Label>
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                {Object.entries(COUNTERPARTY_TYPE_LABELS).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-ink">
                    <Checkbox name="types" value={value} defaultChecked={c.types.includes(value)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor={`e-notes-${c.id}`}>Observações</Label>
              <Input id={`e-notes-${c.id}`} name="notes" defaultValue={c.notes ?? ""} />
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
      <td className="py-2 pr-4 text-ink-soft">{c.document_number ?? "—"}</td>
      <td className="py-2 pr-4 text-ink-soft">{(c.types ?? []).map((t) => COUNTERPARTY_TYPE_LABELS[t]).join(", ") || "—"}</td>
      <td className="py-2 pr-4 text-ink-soft">{c.email ?? "—"}</td>
      <td className="py-2 pr-4">
        <StatusBadge status={c.status} />
      </td>
      {canEdit && (
        <td className="py-2 pr-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-brand-accent hover:underline">
              Editar
            </button>
            <ToggleStatusButton isActive={c.status === "ativo"} action={toggleCounterpartyStatusAction.bind(null, c.id, c.status)} />
            <DeleteButton action={deleteCounterpartyAction.bind(null, c.id)} itemLabel={c.name} />
          </div>
        </td>
      )}
    </tr>
  );
}
