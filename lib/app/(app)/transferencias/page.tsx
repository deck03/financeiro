import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { NewTransferForm } from "./new-transfer-form";
import { TRANSFER_CLASSIFICATION_LABELS } from "@/lib/labels/transferencias";
import { ExportButtons } from "@/components/export-buttons";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function TransferenciasPage() {
  const supabase = createClient();
  const canCreate = await hasPermission("criar_transferencias");
  const canExport = await hasPermission("exportar_relatorios");

  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("id, name:display_name, ownership")
    .eq("status", "ativa")
    .order("display_name");

  const { data: transfers } = await supabase
    .from("transfers")
    .select(
      "id, amount, transfer_date, classification, notes, from:from_bank_account_id(display_name), to:to_bank_account_id(display_name)"
    )
    .order("transfer_date", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Transferências</h1>
        <p className="text-sm text-ink-soft">
          Movimentações entre contas. Nunca aparecem como receita ou despesa.
        </p>
      </div>

      <Card>
        {canCreate && (
          <div className="mb-6">
            <NewTransferForm bankAccounts={(bankAccounts ?? []) as any} />
          </div>
        )}

        {canExport && (
          <div className="mb-3 flex justify-end">
            <ExportButtons
              options={[
                { label: "Exportar CSV", href: "/api/export/transferencias?format=csv" },
                { label: "Exportar Excel", href: "/api/export/transferencias?format=xlsx" },
              ]}
            />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Data</th>
                <th className="py-2 pr-4 font-medium">Origem</th>
                <th className="py-2 pr-4 font-medium">Destino</th>
                <th className="py-2 pr-4 font-medium">Classificação</th>
                <th className="py-2 pr-4 font-medium num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {(transfers ?? []).map((t: any) => (
                <tr key={t.id} className="border-b border-base-border last:border-0">
                  <td className="py-2 pr-4 text-ink-soft">{formatDate(t.transfer_date)}</td>
                  <td className="py-2 pr-4 text-ink">{t.from?.display_name}</td>
                  <td className="py-2 pr-4 text-ink">{t.to?.display_name}</td>
                  <td className="py-2 pr-4 text-ink-soft">{TRANSFER_CLASSIFICATION_LABELS[t.classification]}</td>
                  <td className="num py-2 pr-4 text-ink">{formatCurrency(t.amount)}</td>
                </tr>
              ))}
              {(transfers ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-faint">
                    Nenhuma transferência registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
