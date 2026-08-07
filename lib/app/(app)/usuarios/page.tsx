import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { UserPermissionsPanel } from "./user-permissions-panel";

/**
 * Tela de usuários e permissões (Fase 12) — habilita o item de menu que
 * estava reservado desde a Fase 1.
 *
 * - Lista os usuários da organização com papel e situação.
 * - Para operadores, o administrador ajusta permissões individuais
 *   (user_permissions): concede além do padrão do papel ou revoga algo que
 *   o papel concederia. A RLS já restringe a escrita a administradores
 *   (política "user_permissions_write_admin", Fase 1).
 * - Administradores sempre têm todas as permissões (regra da função
 *   has_permission no banco) — por isso não têm ajustes individuais.
 */
export default async function UsuariosPage() {
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role_key === "admin";

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Usuários e permissões</h1>
        </div>
        <Card>
          <p className="text-sm text-ink-soft">
            Apenas administradores podem gerenciar usuários e permissões.
          </p>
        </Card>
      </div>
    );
  }

  const supabase = createClient();

  const [{ data: users }, { data: permissions }, { data: rolePermissions }, { data: overrides }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role_key, is_active")
        .is("deleted_at", null)
        .order("full_name"),
      supabase.from("permissions").select("key, name, category").order("category").order("name"),
      supabase.from("role_permissions").select("role_key, permission_key"),
      supabase.from("user_permissions").select("user_id, permission_key, is_granted"),
    ]);

  const operatorDefaults = new Set(
    (rolePermissions ?? []).filter((rp) => rp.role_key === "operador").map((rp) => rp.permission_key)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Usuários e permissões</h1>
        <p className="text-sm text-ink-soft">
          Ajuste o que cada operador pode fazer. Administradores sempre têm acesso total. Para
          criar novos usuários, use o painel do Supabase (Authentication → Users) — o
          procedimento está no README.
        </p>
      </div>

      <UserPermissionsPanel
        users={(users ?? []) as any}
        permissions={(permissions ?? []) as any}
        operatorDefaults={Array.from(operatorDefaults)}
        overrides={(overrides ?? []) as any}
      />
    </div>
  );
}
