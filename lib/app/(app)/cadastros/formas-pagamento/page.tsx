import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStatusButton } from "@/components/ui/toggle-status-button";
import { NewPaymentMethodForm } from "./new-payment-method-form";
import { togglePaymentMethodStatusAction } from "./actions";

export default async function FormasPagamentoPage() {
  const supabase = createClient();
  const canEdit = await hasPermission("alterar_formas_pagamento");

  const { data: methods } = await supabase
    .from("payment_methods")
    .select("id, name, status, display_order")
    .order("display_order");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Formas de pagamento</h1>
        <p className="text-sm text-ink-soft">Usadas para identificar como cada lançamento foi pago ou recebido.</p>
      </div>

      <Card>
        {canEdit && (
          <div className="mb-5">
            <NewPaymentMethodForm />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Nome</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                {canEdit && <th className="py-2 pr-4 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {(methods ?? []).map((m) => (
                <tr key={m.id} className="border-b border-base-border last:border-0">
                  <td className="py-2 pr-4 text-ink">{m.name}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={m.status} />
                  </td>
                  {canEdit && (
                    <td className="py-2 pr-4">
                      <ToggleStatusButton
                        isActive={m.status === "ativo"}
                        action={togglePaymentMethodStatusAction.bind(null, m.id, m.status)}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {(methods ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-ink-faint">
                    Nenhuma forma de pagamento cadastrada.
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
