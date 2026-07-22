"use client";

import { Button } from "@/components/ui/button";

/**
 * Tela de erro da área logada (Fase 12).
 *
 * O Next.js renderiza este componente quando um Server Component ou uma
 * página lança um erro não tratado. Nada de stack trace para o usuário —
 * mensagem clara e um botão para tentar de novo.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-card border border-base-border bg-base-surface p-8 text-center">
        <p className="text-3xl">⚠️</p>
        <h1 className="mt-3 text-lg font-semibold text-ink">Algo deu errado</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Não foi possível carregar esta tela. Isso pode ser uma instabilidade momentânea de
          conexão com o banco de dados. Seus dados não foram perdidos.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-ink-faint">Código do erro: {error.digest}</p>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => reset()}>Tentar novamente</Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/dashboard")}>
            Ir para o Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
