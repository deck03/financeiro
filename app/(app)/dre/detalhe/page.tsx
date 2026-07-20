import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/finance/period";
import Link from "next/link";

export default async function DreDetalhePage({
  searchParams,
}: {
  searchParams: {
    regime?: string;
    from?: string;
    to?: string;
    type?: string;
    dre_behavior?: string;
    managerial_nature?: string;
    family?: string;
  };
}) {
  const supabase = createClient();
  const regime = searchParams.regime === "competencia" ? "competencia" : "caixa";
  const from = searchParams.from ?? "";
  const to = searchParams.to ?? "";
  const type = searchParams.type ?? "";

  type Row = { id: string; date: string; description: string; amount: number; type: string };
  let rows: Row[] = [];

  if (regime === "caixa") {
    const { data } = await supabase
      .from("financial_settlements")
      .select(
        "settlement_date, amount, entry_id, financial_entries(type, description, chart_account_categories(dre_behavior, managerial_nature, chart_account_families(name)))"
      )
      .eq("status", "valido")
      .gte("settlement_date", from)
      .lte("settlement_date", to);

    rows = (data ?? [])
      .filter((s: any) => s.financial_entries)
      .filter((s: any) => matchesFilters(s.financial_entries, searchParams))
      .map((s: any) => ({
        id: s.entry_id,
        date: s.settlement_date,
        description: s.financial_entries.description,
        amount: Number(s.amount),
        type: s.financial_entries.type,
      }));
  } else {
    const { data } = await supabase
      .from("financial_entries")
      .select("id, competence_date, description, original_amount, type, chart_account_categories(dre_behavior, managerial_nature, chart_account_families(name))")
      .gte("competence_date", from)
      .lte("competence_date", to)
      .not("status", "in", "(cancelado,estornado)");

    rows = (data ?? [])
      .filter((e: any) => matchesFilters(e, searchParams))
      .map((e: any) => ({
        id: e.id,
        date: e.competence_date,
        description: e.description,
        amount: Number(e.original_amount),
        type: e.type,
      }));
  }

  rows.sort((a, b) => b.date.localeCompare(a.date));
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Detalhamento</h1>
        <p className="text-sm text-ink-soft">
          {formatDate(from)} a {formatDate(to)} · {regime === "caixa" ? "Regime de caixa" : "Regime de competência"}
        </p>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-ink-soft">{rows.length} lançamento(s)</p>
          <p className="num text-lg font-semibold text-ink">{formatCurrency(total)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Data</th>
                <th className="py-2 pr-4 font-medium">Descrição</th>
                <th className="py-2 pr-4 font-medium num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-base-border last:border-0">
                  <td className="py-2 pr-4 text-ink-soft">{formatDate(r.date)}</td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`${r.type === "despesa" ? "/contas-a-pagar" : "/contas-a-receber"}/${r.id}`}
                      className="text-ink hover:text-brand-accent hover:underline"
                    >
                      {r.description}
                    </Link>
                  </td>
                  <td className="num py-2 pr-4 text-ink">{formatCurrency(r.amount)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-ink-faint">
                    Nenhum lançamento encontrado para este filtro.
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

function matchesFilters(
  entry: { type: string; chart_account_categories?: { dre_behavior: string; managerial_nature: string; chart_account_families?: { name: string } } },
  filters: { type?: string; dre_behavior?: string; managerial_nature?: string; family?: string }
) {
  if (filters.type && entry.type !== filters.type) return false;
  if (filters.dre_behavior && entry.chart_account_categories?.dre_behavior !== filters.dre_behavior) return false;
  if (filters.managerial_nature && entry.chart_account_categories?.managerial_nature !== filters.managerial_nature) return false;
  if (filters.family && entry.chart_account_categories?.chart_account_families?.name !== filters.family) return false;
  return true;
}
