import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EntryForm } from "@/components/lancamentos/entry-form";

export default async function NovaContaAReceberPage() {
  const supabase = createClient();

  const { data: categories } = await supabase
    .from("chart_account_categories")
    .select("id, name, chart_account_families!inner(type)")
    .eq("status", "ativo")
    .eq("chart_account_families.type", "receita")
    .order("name");

  const categoryIds = (categories ?? []).map((c) => c.id);

  const [{ data: subcategories }, { data: costCenters }, { data: bankAccounts }, { data: counterparties }, { data: paymentMethods }] =
    await Promise.all([
      categoryIds.length
        ? supabase
            .from("chart_account_subcategories")
            .select("id, name, category_id")
            .eq("status", "ativo")
            .in("category_id", categoryIds)
            .order("name")
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("cost_centers").select("id, name").eq("status", "ativo").order("name"),
      supabase.from("bank_accounts").select("id, name:display_name, ownership").eq("status", "ativa").order("display_name"),
      supabase.from("counterparties").select("id, name").eq("status", "ativo").order("name"),
      supabase.from("payment_methods").select("id, name").eq("status", "ativo").order("name"),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Nova conta a receber</h1>
        <p className="text-sm text-ink-soft">
          Preencha os dados obrigatórios. Você pode marcar como já recebida se o recebimento já ocorreu.
        </p>
      </div>

      <Card>
        <EntryForm
          type="receita"
          categories={categories ?? []}
          subcategories={subcategories ?? []}
          costCenters={costCenters ?? []}
          bankAccounts={bankAccounts ?? []}
          counterparties={counterparties ?? []}
          paymentMethods={paymentMethods ?? []}
        />
      </Card>
    </div>
  );
}
