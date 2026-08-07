"use client";

import { useState, useTransition } from "react";
import { deletePendingTransactionsAction } from "./actions";
import { Button } from "@/components/ui/button";

/**
 * Exclusão em massa das transações ainda não conciliadas de uma conta —
 * útil quando uma contagem não bate com o arquivo original (ex.: sobras de
 * um teste de importação anterior). Pede confirmação explícita porque é
 * uma ação destrutiva, mesmo não afetando nenhum lançamento financeiro
 * real (só a cópia do extrato dentro do sistema).
 */
export function DeletePendingButton({ bankAccountId, count }: { bankAccountId: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  if (count === 0) return null;

  if (done !== null) {
    return <p className="text-xs text-ink-faint">{done} transação(ões) pendente(s) excluída(s).</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-signal-negative hover:underline">
        Excluir todas as pendentes desta conta
      </button>
    );
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deletePendingTransactionsAction(bankAccountId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(result.deletedCount ?? 0);
    });
  }

  return (
    <div className="rounded-card border border-signal-negative/30 bg-signal-negativeSoft/40 p-3 text-sm">
      <p className="text-ink">
        Isso vai excluir as {count} transações ainda não conciliadas desta conta. Nenhum
        lançamento financeiro é afetado (elas nunca viraram lançamento) — só a cópia do extrato
        dentro do sistema. Use isso para corrigir uma importação com contagem errada e
        reimportar o arquivo depois. Não afeta transações já conciliadas ou ignoradas.
      </p>
      {error && <p className="mt-2 text-signal-negative">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="secondary" disabled={isPending} onClick={handleConfirm}>
          {isPending ? "Excluindo..." : `Confirmar exclusão das ${count} pendentes`}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
