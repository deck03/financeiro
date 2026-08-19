import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { RecurringRuleCard } from "./recurring-rule-card";
import Link from "next/link";

export default async function RecorrenciasPage({
  searchParams,
}: {
  searchParams: { erro_geracao?: string };
}) {
  const supabase = createClient();
  const canManage = await hasPermission("criar_lancamentos");

  const [
    { data: rules },
    { data: categories },
    { data: subcategories },
    { data: costCenters },
    { data: bankAccounts },
    { data: counterparties },
    { data: paymentMethods },
  ] = await Promise.all([
    supabase
      .from("recurring_rules")
      .select(
        "id, description, type, amount, frequency, interval_count, status, start_date, end_date, max_occurrences, adjust_business_day, competence_anchor_date, category_id, subcategory_id, cost_center_id, bank_account_id, counterparty_id, payment_method_id"
      )
      .order("created_at", { ascending: false }),
    supabase.from("chart_account_categories").select("id, name").eq("status", "ativo").order("name"),
    supabase.from("chart_account_subcategories").select("id, name, category_id").eq("status", "ativo").order("name"),
    supabase.from("cost_centers").select("id, name").eq("status", "ativo").order("name"),
    supabase.from("bank_accounts").select("id, name:display_name, ownership").eq("status", "ativa").order("display_name"),
    supabase.from("counterparties").select("id, name").eq("status", "ativo").order("name"),
    supabase.from("payment_methods").select("id, name").eq("status", "ativo").order("name"),
  ]);

  const rulesWithEntries = await Promise.all(
    (rules ?? []).map(async (r) => {
      const { data: entries } = await supabase
        .from("financial_entries")
        .select("id, due_date, status")
        .eq("recurring_rule_id", r.id)
        .in("status", ["em_aberto", "agendado"])
        .order("due_date", { ascending: true })
        .limit(24);
      return { ...r, upcomingEntries: entries ?? [] };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Recorrências</h1>
          <p className="text-sm text-ink-soft">
            Regras de lançamentos recorrentes. As ocorrências futuras são geradas com até 12
            meses de antecedência.
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <Link href="/contas-a-pagar/nova">
                <span className="inline-flex items-center rounded-card border border-base-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-base-bg">
                  Nova recorrência (despesa)
                </span>
              </Link>
              <Link href="/contas-a-receber/nova">
                <span className="inline-flex items-center rounded-card border border-base-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-base-bg">
                  Nova recorrência (receita)
                </span>
              </Link>
            </>
          )}
        </div>
      </div>

      {searchParams.erro_geracao && (
        <div className="rounded-card border border-signal-negative/40 bg-signal-negative/10 px-4 py-3 text-sm text-signal-negative">
          A recorrência foi criada, mas não foi possível gerar os lançamentos automaticamente —
          por isso ela ainda não aparece em Contas a pagar/receber. Use o botão &quot;Gerar
          próximas ocorrências&quot; abaixo para tentar novamente.
        </div>
      )}

      <div className="space-y-4">
        {rulesWithEntries.map((r) => (
          <RecurringRuleCard
            key={r.id}
            rule={r as any}
            canManage={canManage}
            categories={categories ?? []}
            subcategories={subcategories ?? []}
            costCenters={costCenters ?? []}
            bankAccounts={(bankAccounts ?? []) as any}
            counterparties={counterparties ?? []}
            paymentMethods={paymentMethods ?? []}
          />
        ))}

        {rulesWithEntries.length === 0 && (
          <Card>
            <p className="text-sm text-ink-faint">
              Nenhuma recorrência criada ainda. Crie uma pela aba "Recorrente" ao criar uma nova
              conta a pagar ou a receber.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
