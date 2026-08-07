"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestPasswordRecoveryAction, type RecoveryState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import Link from "next/link";

const initialState: RecoveryState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Enviando..." : "Enviar link de recuperação"}
    </Button>
  );
}

export function RecoveryForm() {
  const [state, formAction] = useFormState(requestPasswordRecoveryAction, initialState);

  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-card bg-signal-positiveSoft px-3 py-2 text-sm text-signal-positive">
          Se o e-mail informado estiver cadastrado, você receberá um link para redefinir a
          senha em instantes.
        </p>
        <Link href="/login" className="text-sm text-ink-soft hover:text-brand-accent">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <div className="text-center">
        <Link href="/login" className="text-sm text-ink-soft hover:text-brand-accent">
          Voltar para o login
        </Link>
      </div>
    </form>
  );
}
