"use client";

import { useTransition } from "react";
import { generateMoreOccurrencesAction } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";

export function GenerateOccurrencesButton({ ruleId }: { ruleId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={isPending}
      onClick={() => startTransition(() => generateMoreOccurrencesAction(ruleId))}
    >
      {isPending ? "Gerando..." : "Gerar próximas ocorrências"}
    </Button>
  );
}
