"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createPaymentMethodAction, type FormState } from "./actions";
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

export function NewPaymentMethodForm() {
  const [state, formAction] = useFormState(createPaymentMethodAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="pm-name">Nome</Label>
        <Input id="pm-name" name="name" placeholder="Ex.: PIX" required />
      </div>
      <SubmitButton />
      {state.error && (
        <p className="sm:basis-full rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}
    </form>
  );
}
