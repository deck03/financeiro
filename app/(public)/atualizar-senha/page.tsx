import { UpdatePasswordForm } from "./update-password-form";

export default function AtualizarSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-sidebar px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-white">Definir nova senha</h1>
        </div>
        <div className="rounded-card bg-base-surface p-6 shadow-lg">
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
