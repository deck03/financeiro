import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { NewCounterpartyForm } from "./new-counterparty-form";
import { CounterpartyRow } from "./counterparty-row";

export default async function ContrapartesPage() {
  const supabase = createClient();
  const canCreate = await hasPermission("criar_contrapartes");
  const canEdit = await hasPermission("editar_contrapartes");

  const { data: counterparties } = await supabase
    .from("counterparties")
    .select("id, name, trade_name, document_number, email, phone, address, types, notes, status")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Contrapartes</h1>
        <p className="text-sm text-ink-soft">
          Cadastro único usado em contas a pagar, contas a receber, recibos e relatórios.
        </p>
      </div>

      <Card>
        {canCreate && (
          <div className="mb-6">
            <NewCounterpartyForm />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Nome</th>
                <th className="py-2 pr-4 font-medium">Documento</th>
                <th className="py-2 pr-4 font-medium">Tipos</th>
                <th className="py-2 pr-4 font-medium">E-mail</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                {canEdit && <th className="py-2 pr-4 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {(counterparties ?? []).map((c) => (
                <CounterpartyRow key={c.id} counterparty={c as any} canEdit={canEdit} />
              ))}
              {(counterparties ?? []).length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="py-4 text-center text-ink-faint">
                    Nenhuma contraparte cadastrada.
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
