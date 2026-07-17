import Link from "next/link";
import { EntryStatusBadge } from "@/components/ui/entry-status-badge";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function EntriesTable({
  entries,
  basePath,
}: {
  entries: any[];
  basePath: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-base-border text-left text-ink-soft">
            <th className="py-2 pr-4 font-medium">Descrição</th>
            <th className="py-2 pr-4 font-medium">Contraparte</th>
            <th className="py-2 pr-4 font-medium">Categoria</th>
            <th className="py-2 pr-4 font-medium">Vencimento</th>
            <th className="py-2 pr-4 font-medium num">Valor</th>
            <th className="py-2 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-base-border last:border-0 hover:bg-base-bg">
              <td className="py-2 pr-4">
                <Link href={`${basePath}/${e.id}`} className="text-ink hover:text-brand-accent hover:underline">
                  {e.description}
                </Link>
              </td>
              <td className="py-2 pr-4 text-ink-soft">{e.counterparties?.name ?? "—"}</td>
              <td className="py-2 pr-4 text-ink-soft">{e.chart_account_categories?.name ?? "—"}</td>
              <td className="py-2 pr-4 text-ink-soft">{formatDate(e.due_date)}</td>
              <td className="num py-2 pr-4 text-ink">{formatCurrency(e.original_amount)}</td>
              <td className="py-2 pr-4">
                <EntryStatusBadge status={e.status} dueDate={e.due_date} />
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-ink-faint">
                Nenhum lançamento encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
