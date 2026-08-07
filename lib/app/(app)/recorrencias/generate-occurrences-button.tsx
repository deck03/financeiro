"use client";

import { useState, useTransition } from "react";
import { generateMoreOccurrencesAction } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";

export function GenerateOccurrencesButton({ ruleId }: { ruleId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateMoreOccurrencesAction(ruleId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <Button variant="secondary" disabled={isPending} onClick={handleClick}>
        {isPending ? "Gerando..." : "Gerar próximas ocorrências"}
      </Button>
      {error && <p className="mt-1 text-xs text-signal-negative">{error}</p>}
    </div>
  );
}
