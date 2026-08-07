"use client";

import { useState, useTransition } from "react";

/**
 * Botão de excluir reutilizável para os cadastros (centros de custo,
 * plano de contas, contrapartes, contas bancárias, formas de pagamento).
 * Sempre pede confirmação; se a exclusão falhar (o item está em uso), a
 * mensagem de erro do servidor aparece ao lado — nunca falha em silêncio.
 */
export function DeleteButton({
  action,
  itemLabel,
}: {
  action: () => Promise<{ error?: string }>;
  itemLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`Excluir "${itemLabel}"? Isso não pode ser desfeito.`)) return;
          setError(null);
          startTransition(async () => {
            const result = await action();
            if (result?.error) setError(result.error);
          });
        }}
        className="text-xs text-ink-faint hover:text-signal-negative hover:underline disabled:opacity-50"
      >
        {isPending ? "Excluindo..." : "Excluir"}
      </button>
      {error && <span className="mt-1 max-w-xs text-xs text-signal-negative">{error}</span>}
    </span>
  );
}
