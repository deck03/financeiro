import { RecoveryForm } from "./recovery-form";

export default function RecuperarSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-sidebar px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-white">Recuperar senha</h1>
          <p className="mt-1 text-sm text-white/60">
            Informe seu e-mail para receber o link de redefinição
          </p>
        </div>
        <div className="rounded-card bg-base-surface p-6 shadow-lg">
          <RecoveryForm />
        </div>
      </div>
    </div>
  );
}
