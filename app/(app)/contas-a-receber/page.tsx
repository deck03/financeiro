import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EntryFilters } from "@/components/lancamentos/entry-filters";
import { EntriesTable } from "@/components/lancamentos/entries-table";
import { EntryTotals } from "@/components/lancamentos/entry-totals";

const OPEN_STATUSES = ["em_aberto", "agendado", "parcialmente_recebido"];

export default async function ContasAReceberPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const supabase = createClient();
  const canCreate = await hasPermission("criar_lancamentos");
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("financial_entries")
    .select(
      "id, description, original_amount, due_date, status, counterparties(name), chart_account_categories(name)"
    )
    .eq("type", "receita")
    .order("due_date", { ascending: true });

  if (searchParams.q) {
    query = query.ilike("description", `%${searchParams.q}%`);
  }
  if (searchParams.status === "vencido") {
    query = query.in("status", OPEN_STATUSES).lt("due_date", today);
  } else if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: entries } = await query;

  const { data: totalsData } = await supabase
    .from("financial_entries")
    .select("original_amount, status, due_date")
    .eq("type", "receita");

  const openTotal = (totalsData ?? [])
    .filter((e) => e.status === "em_aberto" || e.status === "agendado" || e.status === "parcialmente_recebido")
    .reduce((sum, e) => sum + Number(e.original_amount), 0);
  const receivedTotal = (totalsData ?? [])
    .filter((e) => e.status === "recebido")
    .reduce((sum, e) => sum + Number(e.original_amount), 0);
  const overdueTotal = (totalsData ?? [])
    .filter((e) => OPEN_STATUSES.includes(e.status) && e.due_date < today)
    .reduce((sum, e) => sum + Number(e.original_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Contas a receber</h1>
          <p className="text-sm text-ink-soft">Receitas registradas, em aberto ou já recebidas.</p>
        </div>
        {canCreate && (
          <Link href="/contas-a-receber/nova">
            <Button>Nova conta a receber</Button>
          </Link>
        )}
      </div>

      <EntryTotals openTotal={openTotal} settledTotal={receivedTotal} settledLabel="Total recebido" overdueTotal={overdueTotal} />

      <Card>
        <EntryFilters type="receita" />
        <EntriesTable entries={entries ?? []} basePath="/contas-a-receber" />
      </Card>
    </div>
  );
}
