"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UpdatePasswordForm } from "./update-password-form";

export default function AtualizarSenhaPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const supabase = createClient();

    async function establishSession() {
      // Fluxo com tokens no fragmento da URL (#access_token=...&refresh_token=...),
      // usado pelo link de recuperação de senha enviado por e-mail.
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // limpa o token da URL por segurança, sem recarregar a página
        window.history.replaceState(null, "", window.location.pathname);
        setStatus(error ? "error" : "ready");
        return;
      }

      // Caso o fluxo já tenha passado por /auth/callback (?code=...),
      // só confirmamos se a sessão já existe.
      const { data } = await supabase.auth.getSession();
      setStatus(data.session ? "ready" : "error");
    }

    establishSession();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-sidebar px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-white">Definir nova senha</h1>
        </div>
        <div className="rounded-card bg-base-surface p-6 shadow-lg">
          {status === "loading" && <p className="text-sm text-ink-soft">Carregando...</p>}
          {status === "error" && (
            <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
              Link inválido ou expirado. Solicite um novo link de recuperação de senha.
            </p>
          )}
          {status === "ready" && <UpdatePasswordForm />}
        </div>
      </div>
    </div>
  );
}
