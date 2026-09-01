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

/** Soma das liquidações válidas de um lançamento — null se nunca foi liquidado. */
function settledSum(entry: { financial_settlements?: { amount: number; status: string }[] }): number | null {
  const settlements = (entry.financial_settlements ?? []).filter((s) => s.status === "valido");
  if (settlements.length === 0) return null;
  return settlements.reduce((sum, s) => sum + Number(s.amount), 0);
}

export default async function ContasAPagarPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; from?: string; to?: string; category_id?: string; subcategory_id?: string; counterparty_id?: string; all?: string };
}) {
  const supabase = createClient();
  const canCreate = await hasPermission("criar_lancamentos");
  const canExport = await hasPermission("exportar_relatorios");
  const today = new Date().toISOString().slice(0, 10);

  // Sem NENHUM filtro na URL (primeira visita, ou voltando do menu), a
  // ideia é o operador abrir a tela e já saber tudo que precisa de
  // atenção hoje — não só o que vence exatamente hoje, mas também o que
  // já venceu e ainda está em aberto. O marcador "all=1" (do link "Ver
  // todos os lançamentos") desliga esse padrão de propósito.
  const noFiltersAtAll =
    !searchParams.q &&
    !searchParams.status &&
    !searchParams.from &&
    !searchParams.to &&
    !searchParams.category_id &&
    !searchParams.subcategory_id &&
    !searchParams.counterparty_id &&
    searchParams.all !== "1";

  let from: string | undefined = searchParams.from;
  let to: string | undefined = searchParams.to;

  let query = supabase
    .from("financial_entries")
    .select(
      "id, description, original_amount, due_date, status, counterparties(name), chart_account_categories(name), financial_settlements(amount, status)"
    )
    .eq("type", "despesa")
    .order("due_date", { ascending: true });

  if (noFiltersAtAll) {
    // Vencidas e em aberto até hoje — inclui o que já passou do prazo,
    // não só o que vence exatamente hoje.
    query = query.in("status", OPEN_STATUSES).lte("due_date", today);
  } else {
    if (searchParams.q) query = query.ilike("description", `%${searchParams.q}%`);
    if (from) query = query.gte("due_date", from);
    if (to) query = query.lte("due_date", to);
    if (searchParams.category_id) query = query.eq("category_id", searchParams.category_id);
    if (searchParams.subcategory_id) query = query.eq("subcategory_id", searchParams.subcategory_id);
    if (searchParams.counterparty_id) query = query.eq("counterparty_id", searchParams.counterparty_id);
    if (searchParams.status === "vencido") {
      query = query.in("status", OPEN_STATUSES).lt("due_date", today);
    } else if (searchParams.status) {
      query = query.eq("status", searchParams.status);
    }
  }

  // O resumo do topo respeita os mesmos filtros de busca/categoria/
  // subcategoria/fornecedor/período da listagem — só o filtro de status
  // fica de fora aqui, porque o resumo já é uma quebra POR status (em
  // aberto/pago/vencido simultaneamente); aplicar mais um filtro de status
  // por cima zeraria a maioria dos cartões.
  let totalsQuery = supabase
    .from("financial_entries")
    .select("original_amount, status, due_date, financial_settlements(amount, status)")
    .eq("type", "despesa");
  if (noFiltersAtAll) {
    // Os cartões do topo acompanham a mesma janela da lista (até hoje),
    // mas continuam mostrando a quebra por status normalmente — não só
    // "em aberto", para o operador ainda ver quanto já foi pago/recebido
    // do que vencia até hoje.
    totalsQuery = totalsQuery.lte("due_date", today);
  } else {
    if (searchParams.q) totalsQuery = totalsQuery.ilike("description", `%${searchParams.q}%`);
    if (from) totalsQuery = totalsQuery.gte("due_date", from);
    if (to) totalsQuery = totalsQuery.lte("due_date", to);
    if (searchParams.category_id) totalsQuery = totalsQuery.eq("category_id", searchParams.category_id);
    if (searchParams.subcategory_id) totalsQuery = totalsQuery.eq("subcategory_id", searchParams.subcategory_id);
    if (searchParams.counterparty_id) totalsQuery = totalsQuery.eq("counterparty_id", searchParams.counterparty_id);
  }

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

  // Anexa o valor realmente liquidado a cada lançamento, para a lista
  // mostrar isso em vez do valor esperado quando já existir liquidação.
  const entriesWithSettled = (entries ?? []).map((e: any) => ({ ...e, display_amount: settledSum(e) }));

  const openTotal = (totalsData ?? [])
    .filter((e) => e.status === "em_aberto" || e.status === "agendado" || e.status === "parcialmente_pago")
    .reduce((sum, e) => sum + Number(e.original_amount), 0);
  // "Total pago" agora soma o que foi de fato liquidado, não o valor
  // esperado — os dois podem divergir quando a conciliação foi feita com
  // um valor diferente do lançamento (ex.: "considerar totalmente
  // liquidado" com uma recorrência de valor variável).
  const paidTotal = (totalsData ?? [])
    .filter((e: any) => e.status === "pago")
    .reduce((sum: number, e: any) => sum + (settledSum(e) ?? Number(e.original_amount)), 0);
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

      {noFiltersAtAll && (
        <p className="text-sm text-ink-soft">
          Mostrando contas vencidas e em aberto até hoje.{" "}
          <a href="/contas-a-pagar?all=1" className="font-medium text-brand-accent hover:underline">
            Ver todos os lançamentos
          </a>
        </p>
      )}

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
                if (from) qs.set("from", from);
                if (to) qs.set("to", to);
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
        <EntriesTable entries={entriesWithSettled} basePath="/contas-a-pagar" />
      </Card>
    </div>
  );
}
