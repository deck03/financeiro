import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStatusButton } from "@/components/ui/toggle-status-button";
import { NewCostCenterForm } from "./new-cost-center-form";
import { toggleCostCenterStatusAction, setDefaultCostCenterAction } from "./actions";

export default async function CentrosDeCustoPage() {
  const supabase = createClient();
  const canEdit = await hasPermission("alterar_centros_de_custo");

  const { data: costCenters } = await supabase
    .from("cost_centers")
    .select("id, name, code, status, is_default, display_order")
    .order("display_order");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Centros de custo</h1>
        <p className="text-sm text-ink-soft">
          Opcionais nos lançamentos — ajudam a agrupar despesas e receitas por área.
        </p>
      </div>

      <Card>
        {canEdit && (
          <div className="mb-5">
            <NewCostCenterForm />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Nome</th>
                <th className="py-2 pr-4 font-medium">Padrão</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                {canEdit && <th className="py-2 pr-4 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {(costCenters ?? []).map((cc) => (
                <tr key={cc.id} className="border-b border-base-border last:border-0">
                  <td className="py-2 pr-4 text-ink">{cc.name}</td>
                  <td className="py-2 pr-4 text-ink-soft">
                    {cc.is_default ? (
                      <span className="text-brand-accent">Padrão</span>
                    ) : canEdit ? (
                      <ToggleStatusButton
                        isActive={false}
                        activeLabel="Definir como padrão"
                        inactiveLabel="Definir como padrão"
                        action={setDefaultCostCenterAction.bind(null, cc.id)}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={cc.status} />
                  </td>
                  {canEdit && (
                    <td className="py-2 pr-4">
                      <ToggleStatusButton
                        isActive={cc.status === "ativo"}
                        action={toggleCostCenterStatusAction.bind(null, cc.id, cc.status)}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {(costCenters ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-ink-faint">
                    Nenhum centro de custo cadastrado.
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
