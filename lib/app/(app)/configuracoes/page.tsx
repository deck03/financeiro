import { createClient } from "@/lib/supabase/server";
import { hasPermission, getCurrentProfile } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentProfile = await getCurrentProfile();
  const isAdmin = currentProfile?.role_key === "admin";

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user!.id)
    .single();

  const { data: settings } = await supabase
    .from("organization_settings")
    .select("display_name, document_number, address")
    .eq("organization_id", profile!.organization_id)
    .single();

  const canEdit = await hasPermission("alterar_configuracoes");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Configurações</h1>
        <p className="text-sm text-ink-soft">Dados básicos do DECK 03 usados no sistema.</p>
      </div>

      <Card>
        <SettingsForm
          defaultValues={{
            display_name: settings?.display_name ?? null,
            document_number: settings?.document_number ?? null,
            address: settings?.address ?? null,
          }}
          canEdit={canEdit}
        />
      </Card>

      {isAdmin && (
        <Card>
          <h2 className="text-sm font-semibold text-ink">Backup dos dados</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Baixa uma planilha Excel com todos os dados do sistema (uma aba por tabela:
            lançamentos, liquidações, transferências, cadastros, recibos etc.). Recomendado
            gerar pelo menos uma vez por mês e guardar em local seguro. O procedimento de
            restauração está documentado no README do projeto (seção &quot;Backup e
            restauração&quot;).
          </p>
          <a
            href="/api/export/backup"
            className="mt-3 inline-flex items-center rounded-card bg-brand-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#255C4E]"
          >
            Gerar backup completo (.xlsx)
          </a>
          <p className="mt-2 text-xs text-ink-faint">
            Dependendo do volume de dados, a geração pode levar alguns segundos. Cada geração
            fica registrada na Auditoria.
          </p>
        </Card>
      )}
    </div>
  );
}
