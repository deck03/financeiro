import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EntryFilters } from "@/components/lancamentos/entry-filters";
import { EntriesTable } from "@/components/lancamentos/entries-table";
import { EntryTotals } from "@/components/lancamentos/entry-totals";
import { ExportButtons } from "@/components/export-buttons";

const OPEN_STATUSES = ["em_aberto", "agendado", "parcialmente_pago"];

export default async function ContasAPagarPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; from?: string; to?: string; category_id?: string; subcategory_id?: string; counterparty_id?: string };
}) {
  const supabase = createClient();
  const canCreate = await hasPermission("criar_lancamentos");
  const canExport = await hasPermission("exportar_relatorios");
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("financial_entries")
    .select(
      "id, description, original_amount, due_date, status, counterparties(name), chart_account_categories(name)"
    )
    .eq("type", "despesa")
    .order("due_date", { ascending: true });

  if (searchParams.q) query = query.ilike("description", `%${searchParams.q}%`);
  if (searchParams.from) query = query.gte("due_date", searchParams.from);
  if (searchParams.to) query = query.lte("due_date", searchParams.to);
  if (searchParams.category_id) query = query.eq("category_id", searchParams.category_id);
  if (searchParams.subcategory_id) query = query.eq("subcategory_id", searchParams.subcategory_id);
  if (searchParams.counterparty_id) query = query.eq("counterparty_id", searchParams.counterparty_id);
  if (searchParams.status === "vencido") {
    query = query.in("status", OPEN_STATUSES).lt("due_date", today);
  } else if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  // O resumo do topo respeita os mesmos filtros de busca/categoria/
  // subcategoria/fornecedor/período da listagem — só o filtro de status
  // fica de fora aqui, porque o resumo já é uma quebra POR status (em
  // aberto/pago/vencido simultaneamente); aplicar mais um filtro de status
  // por cima zeraria a maioria dos cartões.
  let totalsQuery = supabase.from("financial_entries").select("original_amount, status, due_date").eq("type", "despesa");
  if (searchParams.q) totalsQuery = totalsQuery.ilike("description", `%${searchParams.q}%`);
  if (searchParams.from) totalsQuery = totalsQuery.gte("due_date", searchParams.from);
  if (searchParams.to) totalsQuery = totalsQuery.lte("due_date", searchParams.to);
  if (searchParams.category_id) totalsQuery = totalsQuery.eq("category_id", searchParams.category_id);
  if (searchParams.subcategory_id) totalsQuery = totalsQuery.eq("subcategory_id", searchParams.subcategory_id);
  if (searchParams.counterparty_id) totalsQuery = totalsQuery.eq("counterparty_id", searchParams.counterparty_id);

  const [{ data: entries }, { data: totalsData }, { data: categories }, { data: subcategories }, { data: counterparties }] =
    await Promise.all([
      query,
      totalsQuery,
      supabase
        .from("chart_account_categories")
        .select("id, name")
        .eq("status", "ativo")
        .in("type", ["despesa", "ambos"])
        .order("name"),
      supabase.from("chart_account_subcategories").select("id, name, category_id").eq("status", "ativo").order("name"),
      supabase.from("counterparties").select("id, name").eq("status", "ativo").order("name"),
    ]);

  const openTotal = (totalsData ?? [])
    .filter((e) => e.status === "em_aberto" || e.status === "agendado" || e.status === "parcialmente_pago")
    .reduce((sum, e) => sum + Number(e.original_amount), 0);
  const paidTotal = (totalsData ?? [])
    .filter((e) => e.status === "pago")
    .reduce((sum, e) => sum + Number(e.original_amount), 0);
  const overdueTotal = (totalsData ?? [])
    .filter((e) => OPEN_STATUSES.includes(e.status) && e.due_date < today)
    .reduce((sum, e) => sum + Number(e.original_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Contas a pagar</h1>
          <p className="text-sm text-ink-soft">Despesas registradas, em aberto ou já pagas.</p>
        </div>
        {canCreate && (
          <Link href="/contas-a-pagar/nova">
            <Button>Nova conta a pagar</Button>
          </Link>
        )}
      </div>

      <EntryTotals openTotal={openTotal} settledTotal={paidTotal} settledLabel="Total pago" overdueTotal={overdueTotal} />

      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <EntryFilters
            type="despesa"
            categories={categories ?? []}
            subcategories={subcategories ?? []}
            counterparties={counterparties ?? []}
          />
          {canExport && (
            <ExportButtons
              options={(() => {
                const qs = new URLSearchParams({ type: "despesa" });
                if (searchParams.q) qs.set("q", searchParams.q);
                if (searchParams.status) qs.set("status", searchParams.status);
                if (searchParams.from) qs.set("from", searchParams.from);
                if (searchParams.to) qs.set("to", searchParams.to);
                if (searchParams.category_id) qs.set("category_id", searchParams.category_id);
                if (searchParams.subcategory_id) qs.set("subcategory_id", searchParams.subcategory_id);
                if (searchParams.counterparty_id) qs.set("counterparty_id", searchParams.counterparty_id);
                return [
                  { label: "Exportar CSV", href: `/api/export/lancamentos?${qs.toString()}&format=csv` },
                  { label: "Exportar Excel", href: `/api/export/lancamentos?${qs.toString()}&format=xlsx` },
                ];
              })()}
            />
          )}
        </div>
        <EntriesTable entries={entries ?? []} basePath="/contas-a-pagar" />
      </Card>
    </div>
  );
}
