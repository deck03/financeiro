import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role_key, organization_id")
    .eq("id", user!.id)
    .single();

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile?.organization_id ?? "")
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-soft">
          Organização: <span className="font-medium text-ink">{organization?.name}</span>
        </p>
      </div>

      <Card>
        <p className="text-sm text-ink-soft">
          Bem-vindo(a), <span className="font-medium text-ink">{profile?.full_name}</span>. Você
          está autenticado(a) como{" "}
          <span className="font-medium text-ink">
            {profile?.role_key === "admin" ? "Administrador" : "Operador"}
          </span>
          .
        </p>
        <p className="mt-3 text-sm text-ink-faint">
          Esta é a Fase 1 do projeto: fundação, autenticação e permissões. Os indicadores de
          caixa, saldos, contas a pagar/receber e alertas serão implementados nas fases
          seguintes, conforme o plano de fases aprovado.
        </p>
      </Card>
    </div>
  );
}
