import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-sidebar px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-card bg-brand-accent text-lg font-semibold text-white">
            D3
          </div>
          <h1 className="text-lg font-semibold text-white">DECK 03 — Financeiro</h1>
          <p className="mt-1 text-sm text-white/60">Controle financeiro gerencial</p>
        </div>
        <div className="rounded-card bg-base-surface p-6 shadow-lg">
          <LoginForm redirectTo={searchParams.redirectTo} />
        </div>
      </div>
    </div>
  );
}
