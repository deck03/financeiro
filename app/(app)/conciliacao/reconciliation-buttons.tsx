"use client";

import { useTransition } from "react";
import { undoReconciliationAction, unignoreBankTransactionAction } from "./actions";

export function UndoReconciliationButton({ bankTransactionId }: { bankTransactionId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => undoReconciliationAction(bankTransactionId))}
      className="text-sm font-medium text-signal-negative hover:underline disabled:opacity-50"
    >
      {isPending ? "..." : "Desfazer conciliação"}
    </button>
  );
}

export function UnignoreButton({ bankTransactionId }: { bankTransactionId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => unignoreBankTransactionAction(bankTransactionId))}
      className="text-sm font-medium text-brand-accent hover:underline disabled:opacity-50"
    >
      {isPending ? "..." : "Reativar"}
    </button>
  );
}
