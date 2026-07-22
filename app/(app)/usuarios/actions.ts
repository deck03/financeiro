"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type PermissionActionResult = { error?: string; success?: boolean };

/**
 * Define (ou remove) um ajuste individual de permissão para um usuário.
 *
 * mode:
 * - "conceder"  → grava is_granted = true  (dá algo além do padrão do papel)
 * - "revogar"   → grava is_granted = false (tira algo que o papel concederia)
 * - "padrao"    → remove o ajuste; volta a valer o padrão do papel
 *
 * A RLS ("user_permissions_write_admin") garante no banco que apenas
 * administradores conseguem escrever — a checagem abaixo é defesa em
 * profundidade e mensagem amigável.
 */
export async function setUserPermissionAction(
  userId: string,
  permissionKey: string,
  mode: "conceder" | "revogar" | "padrao"
): Promise<PermissionActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role_key !== "admin") {
    return { error: "Apenas administradores podem alterar permissões." };
  }
  if (userId === profile.id) {
    return { error: "Você não pode alterar as próprias permissões." };
  }

  const supabase = createClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role_key, full_name")
    .eq("id", userId)
    .single();

  if (!target) return { error: "Usuário não encontrado." };
  if (target.role_key === "admin") {
    return { error: "Administradores sempre têm todas as permissões — não há o que ajustar." };
  }

  if (mode === "padrao") {
    const { error } = await supabase
      .from("user_permissions")
      .delete()
      .eq("user_id", userId)
      .eq("permission_key", permissionKey);
    if (error) return { error: "Não foi possível remover o ajuste de permissão." };

    await logAudit({
      action: "remover_override",
      entity: "user_permissions",
      entityId: userId,
      metadata: { usuario: target.full_name, permissao: permissionKey },
    });
  } else {
    const isGranted = mode === "conceder";
    const { error } = await supabase.from("user_permissions").upsert(
      {
        user_id: userId,
        permission_key: permissionKey,
        is_granted: isGranted,
        created_by: profile.id,
      },
      { onConflict: "user_id,permission_key" }
    );
    if (error) return { error: "Não foi possível salvar o ajuste de permissão." };

    await logAudit({
      action: isGranted ? "conceder_permissao" : "revogar_permissao",
      entity: "user_permissions",
      entityId: userId,
      metadata: { usuario: target.full_name, permissao: permissionKey },
    });
  }

  revalidatePath("/usuarios");
  return { success: true };
}

/** Ativa/desativa um usuário (sem excluir — histórico é preservado). */
export async function toggleUserActiveAction(userId: string, activate: boolean): Promise<PermissionActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role_key !== "admin") {
    return { error: "Apenas administradores podem ativar ou desativar usuários." };
  }
  if (userId === profile.id) {
    return { error: "Você não pode desativar o próprio usuário." };
  }

  const supabase = createClient();
  const { data: target } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
  const { error } = await supabase.from("profiles").update({ is_active: activate }).eq("id", userId);
  if (error) return { error: "Não foi possível atualizar o usuário." };

  await logAudit({
    action: activate ? "ativar" : "desativar",
    entity: "profiles" as any,
    entityId: userId,
    metadata: { usuario: target?.full_name ?? userId },
  });

  revalidatePath("/usuarios");
  return { success: true };
}
