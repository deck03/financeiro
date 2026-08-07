import Link from "next/link";

/** Página exibida quando o endereço acessado não existe (Fase 12). */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-bg px-4">
      <div className="max-w-md rounded-card border border-base-border bg-base-surface p-8 text-center">
        <p className="text-3xl">🔎</p>
        <h1 className="mt-3 text-lg font-semibold text-ink">Página não encontrada</h1>
        <p className="mt-2 text-sm text-ink-soft">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center justify-center rounded-card bg-brand-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#255C4E]"
        >
          Ir para o Dashboard
        </Link>
      </div>
    </div>
  );
}
