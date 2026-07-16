import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStatusButton } from "@/components/ui/toggle-status-button";
import { NewFamilyForm } from "./new-family-form";
import { NewCategoryForm } from "./new-category-form";
import { NewSubcategoryForm } from "./new-subcategory-form";
import { toggleFamilyStatusAction, toggleCategoryStatusAction, toggleSubcategoryStatusAction } from "./actions";
import {
  FAMILY_TYPE_LABELS,
  MANAGERIAL_NATURE_LABELS,
  DRE_BEHAVIOR_LABELS,
  CASHFLOW_BEHAVIOR_LABELS,
} from "@/lib/labels/plano-de-contas";

export default async function PlanoDeContasPage() {
  const supabase = createClient();
  const canEdit = await hasPermission("alterar_plano_de_contas");

  const [{ data: families }, { data: categories }, { data: subcategories }] = await Promise.all([
    supabase
      .from("chart_account_families")
      .select("id, name, code, type, status, display_order")
      .order("display_order"),
    supabase
      .from("chart_account_categories")
      .select(
        "id, name, code, status, managerial_nature, dre_behavior, cashflow_behavior, display_order, family_id, chart_account_families(name)"
      )
      .order("display_order"),
    supabase
      .from("chart_account_subcategories")
      .select("id, name, code, status, display_order, category_id, chart_account_categories(name)")
      .order("display_order"),
  ]);

  const activeFamilies = (families ?? []).filter((f) => f.status === "ativo");
  const activeCategories = (categories ?? []).filter((c) => c.status === "ativo");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Plano de contas</h1>
        <p className="text-sm text-ink-soft">
          Estrutura hierárquica: Família → Categoria → Subcategoria. As categorias definem como
          cada lançamento aparece na DRE e no fluxo de caixa.
        </p>
      </div>

      {/* Famílias */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Famílias</h2>
        {canEdit && (
          <div className="mb-5">
            <NewFamilyForm />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Nome</th>
                <th className="py-2 pr-4 font-medium">Tipo</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                {canEdit && <th className="py-2 pr-4 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {(families ?? []).map((f) => (
                <tr key={f.id} className="border-b border-base-border last:border-0">
                  <td className="py-2 pr-4 text-ink">{f.name}</td>
                  <td className="py-2 pr-4 text-ink-soft">{FAMILY_TYPE_LABELS[f.type]}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={f.status} />
                  </td>
                  {canEdit && (
                    <td className="py-2 pr-4">
                      <ToggleStatusButton
                        isActive={f.status === "ativo"}
                        action={toggleFamilyStatusAction.bind(null, f.id, f.status)}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {(families ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-ink-faint">
                    Nenhuma família cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Categorias */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Categorias</h2>
        {canEdit && (
          <div className="mb-5">
            <NewCategoryForm families={activeFamilies.map((f) => ({ id: f.id, name: f.name }))} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Nome</th>
                <th className="py-2 pr-4 font-medium">Família</th>
                <th className="py-2 pr-4 font-medium">Natureza</th>
                <th className="py-2 pr-4 font-medium">DRE</th>
                <th className="py-2 pr-4 font-medium">Fluxo de caixa</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                {canEdit && <th className="py-2 pr-4 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {(categories ?? []).map((c: any) => (
                <tr key={c.id} className="border-b border-base-border last:border-0">
                  <td className="py-2 pr-4 text-ink">{c.name}</td>
                  <td className="py-2 pr-4 text-ink-soft">{c.chart_account_families?.name}</td>
                  <td className="py-2 pr-4 text-ink-soft">
                    {MANAGERIAL_NATURE_LABELS[c.managerial_nature]}
                  </td>
                  <td className="py-2 pr-4 text-ink-soft">{DRE_BEHAVIOR_LABELS[c.dre_behavior]}</td>
                  <td className="py-2 pr-4 text-ink-soft">
                    {CASHFLOW_BEHAVIOR_LABELS[c.cashflow_behavior]}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={c.status} />
                  </td>
                  {canEdit && (
                    <td className="py-2 pr-4">
                      <ToggleStatusButton
                        isActive={c.status === "ativo"}
                        action={toggleCategoryStatusAction.bind(null, c.id, c.status)}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {(categories ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-ink-faint">
                    Nenhuma categoria cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Subcategorias */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Subcategorias</h2>
        {canEdit && (
          <div className="mb-5">
            <NewSubcategoryForm
              categories={activeCategories.map((c: any) => ({
                id: c.id,
                name: c.name,
                family_name: c.chart_account_families?.name ?? "",
              }))}
            />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Nome</th>
                <th className="py-2 pr-4 font-medium">Categoria</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                {canEdit && <th className="py-2 pr-4 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {(subcategories ?? []).map((s: any) => (
                <tr key={s.id} className="border-b border-base-border last:border-0">
                  <td className="py-2 pr-4 text-ink">{s.name}</td>
                  <td className="py-2 pr-4 text-ink-soft">{s.chart_account_categories?.name}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={s.status} />
                  </td>
                  {canEdit && (
                    <td className="py-2 pr-4">
                      <ToggleStatusButton
                        isActive={s.status === "ativo"}
                        action={toggleSubcategoryStatusAction.bind(null, s.id, s.status)}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {(subcategories ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-ink-faint">
                    Nenhuma subcategoria cadastrada.
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
