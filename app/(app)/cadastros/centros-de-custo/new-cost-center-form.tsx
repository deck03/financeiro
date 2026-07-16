"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createCostCenterAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar"}
    </Button>
  );
}

export function NewCostCenterForm() {
  const [state, formAction] = useFormState(createCostCenterAction, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
      <div>
        <Label htmlFor="cc-name">Nome</Label>
        <Input id="cc-name" name="name" placeholder="Ex.: Eventos" required />
      </div>
      <div>
        <Label htmlFor="cc-code">Código (opcional)</Label>
        <Input id="cc-code" name="code" />
      </div>
      <SubmitButton />
      {state.error && (
        <p className="sm:col-span-3 rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}
    </form>
  );
}
