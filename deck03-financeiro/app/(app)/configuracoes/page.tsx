import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    </div>
  );
}
