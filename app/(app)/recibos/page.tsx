import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import Link from "next/link";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function RecibosPage() {
  const supabase = createClient();

  const { data: receipts } = await supabase
    .from("rent_receipts")
    .select("id, receipt_number_formatted, amount, payment_date, reference_period, status, counterparties(name)")
    .order("receipt_number", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Recibos de aluguel</h1>
        <p className="text-sm text-ink-soft">Histórico de recibos emitidos, com numeração sequencial.</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Número</th>
                <th className="py-2 pr-4 font-medium">Locatário</th>
                <th className="py-2 pr-4 font-medium">Data</th>
                <th className="py-2 pr-4 font-medium">Período</th>
                <th className="py-2 pr-4 font-medium num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {(receipts ?? []).map((r: any) => (
                <tr key={r.id} className="border-b border-base-border last:border-0 hover:bg-base-bg">
                  <td className="py-2 pr-4">
                    <Link href={`/recibos/${r.id}`} className="text-ink hover:text-brand-accent hover:underline">
                      {r.receipt_number_formatted}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-ink-soft">{r.counterparties?.name ?? "—"}</td>
                  <td className="py-2 pr-4 text-ink-soft">{formatDate(r.payment_date)}</td>
                  <td className="py-2 pr-4 text-ink-soft">{r.reference_period ?? "—"}</td>
                  <td className="num py-2 pr-4 text-ink">{formatCurrency(r.amount)}</td>
                </tr>
              ))}
              {(receipts ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-faint">
                    Nenhum recibo emitido ainda. Emita um recibo a partir de um recebimento
                    confirmado em Contas a Receber.
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
