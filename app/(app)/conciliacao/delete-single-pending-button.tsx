"use client";

import { useTransition } from "react";
import { deleteSinglePendingTransactionAction } from "./actions";

export function DeleteSinglePendingButton({ bankTransactionId }: { bankTransactionId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Excluir esta transação pendente? Ela não pode ser recuperada — reimporte o arquivo se precisar dela de volta."))
          return;
        startTransition(() => {
          void deleteSinglePendingTransactionAction(bankTransactionId);
        });
      }}
      className="text-xs text-ink-faint hover:text-signal-negative hover:underline disabled:opacity-50"
    >
      Excluir
    </button>
  );
}
