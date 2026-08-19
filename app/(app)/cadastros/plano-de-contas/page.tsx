import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { NewFamilyForm } from "./new-family-form";
import { NewCategoryForm } from "./new-category-form";
import { NewSubcategoryForm } from "./new-subcategory-form";
import { FamilyRow } from "./family-row";
import { CategoryRow } from "./category-row";
import { SubcategoryRow } from "./subcategory-row";
import { CATEGORY_TYPE_LABELS } from "@/lib/labels/plano-de-contas";

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
        "id, name, code, status, type, managerial_nature, dre_behavior, cashflow_behavior, display_order, family_id, chart_account_families(name)"
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
                <FamilyRow key={f.id} family={f} canEdit={canEdit} />
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
            <NewCategoryForm families={activeFamilies.map((f) => ({ id: f.id, name: f.name, type: f.type }))} />
          </div>
        )}

        {(["despesa", "receita", "ambos"] as const).map((groupType) => {
          const groupCategories = (categories ?? []).filter((c: any) => c.type === groupType);
          const groupLabel =
            groupType === "despesa"
              ? "Categorias de despesa"
              : groupType === "receita"
                ? "Categorias de receita"
                : "Categorias de despesa e receita (ambos)";
          return (
            <div key={groupType} className="mb-6 last:mb-0">
              <h3 className="mb-2 text-sm font-semibold text-ink-soft">
                {groupLabel} ({groupCategories.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-base-border text-left text-ink-soft">
                      <th className="py-2 pr-4 font-medium">Nome</th>
                      <th className="py-2 pr-4 font-medium">Família</th>
                      <th className="py-2 pr-4 font-medium">Tipo</th>
                      <th className="py-2 pr-4 font-medium">Natureza</th>
                      <th className="py-2 pr-4 font-medium">DRE</th>
                      <th className="py-2 pr-4 font-medium">Fluxo de caixa</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      {canEdit && <th className="py-2 pr-4 font-medium">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {groupCategories.map((c: any) => (
                      <CategoryRow
                        key={c.id}
                        category={c}
                        families={activeFamilies.map((f) => ({ id: f.id, name: f.name }))}
                        canEdit={canEdit}
                      />
                    ))}
                    {groupCategories.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-4 text-center text-ink-faint">
                          Nenhuma categoria neste grupo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
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
              {(subcategories ?? []).map((sc: any) => (
                <SubcategoryRow
                  key={sc.id}
                  subcategory={sc}
                  categories={activeCategories.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    family_name: c.chart_account_families?.name ?? "",
                  }))}
                  canEdit={canEdit}
                />
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
