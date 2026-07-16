"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createCounterpartyAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { COUNTERPARTY_TYPE_LABELS } from "@/lib/labels/contrapartes";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar contraparte"}
    </Button>
  );
}

export function NewCounterpartyForm() {
  const [state, formAction] = useFormState(createCounterpartyAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="cp-name">Nome ou razão social</Label>
          <Input id="cp-name" name="name" required />
        </div>
        <div>
          <Label htmlFor="cp-trade">Nome fantasia (opcional)</Label>
          <Input id="cp-trade" name="trade_name" />
        </div>
        <div>
          <Label htmlFor="cp-document">CPF ou CNPJ (opcional)</Label>
          <Input id="cp-document" name="document_number" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="cp-email">E-mail (opcional)</Label>
          <Input id="cp-email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="cp-phone">Telefone (opcional)</Label>
          <Input id="cp-phone" name="phone" />
        </div>
        <div>
          <Label htmlFor="cp-address">Endereço (opcional)</Label>
          <Input id="cp-address" name="address" />
        </div>
      </div>

      <div>
        <Label>Tipos de contraparte</Label>
        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
          {Object.entries(COUNTERPARTY_TYPE_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-ink">
              <Checkbox name="types" value={value} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="cp-notes">Observações (opcional)</Label>
        <Input id="cp-notes" name="notes" />
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
