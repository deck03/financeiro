import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { OfxUploadForm } from "./ofx-upload-form";

export default async function ImportacaoOfxPage() {
  const supabase = createClient();

  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, name:display_name")
    .eq("status", "ativa")
    .eq("allow_ofx_import", true)
    .order("display_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Importação OFX</h1>
        <p className="text-sm text-ink-soft">
          Envie o extrato exportado do banco (compatível com C6 Bank e outros bancos que seguem
          o padrão OFX). Nenhuma transação é importada sem sua confirmação.
        </p>
      </div>

      <Card>
        {(accounts ?? []).length === 0 ? (
          <p className="text-sm text-ink-faint">
            Nenhuma conta bancária está com "Permitir importação OFX" habilitado. Ajuste isso em
            Contas bancárias.
          </p>
        ) : (
          <OfxUploadForm bankAccounts={accounts ?? []} />
        )}
      </Card>
    </div>
  );
}
