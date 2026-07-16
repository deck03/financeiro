"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createFamilyAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar família"}
    </Button>
  );
}

export function NewFamilyForm() {
  const [state, formAction] = useFormState(createFamilyAction, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
      <div>
        <Label htmlFor="fam-name">Nome</Label>
        <Input id="fam-name" name="name" placeholder="Ex.: Receitas operacionais" required />
      </div>
      <div>
        <Label htmlFor="fam-code">Código (opcional)</Label>
        <Input id="fam-code" name="code" />
      </div>
      <div>
        <Label htmlFor="fam-type">Tipo</Label>
        <Select id="fam-type" name="type" defaultValue="despesa" required>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
          <option value="transferencia">Transferência</option>
        </Select>
      </div>
      <SubmitButton />
      {state.error && (
        <p className="sm:col-span-4 rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}
    </form>
  );
}
