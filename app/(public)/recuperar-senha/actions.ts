"use server";

import { createClient } from "@/lib/supabase/server";
import { recoverySchema } from "@/lib/validation/auth";

export type RecoveryState = {
  error?: string;
  success?: boolean;
};

export async function requestPasswordRecoveryAction(
  _prevState: RecoveryState,
  formData: FormData
): Promise<RecoveryState> {
  const parsed = recoverySchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: "Informe um e-mail válido." };
  }

  const supabase = createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/atualizar-senha`,
  });

  // Por segurança, não revelamos se o e-mail existe ou não na base.
  if (error) {
    console.error("Erro ao solicitar recuperação de senha:", error.message);
  }

  return { success: true };
}
