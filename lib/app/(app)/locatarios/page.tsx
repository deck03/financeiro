import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function LocatariosPage() {
  const supabase = createClient();

  const { data: locatarios } = await supabase
    .from("counterparties")
    .select("id, name, document_number, email, phone, status")
    .contains("types", ["locatario"])
    .order("name");

  // Para cada locatário, busca o recebimento confirmado mais recente ainda sem recibo
  const withPendingReceipts = await Promise.all(
    (locatarios ?? []).map(async (l) => {
      const { data: entries } = await supabase
        .from("financial_entries")
        .select("id")
        .eq("counterparty_id", l.id)
        .eq("type", "receita");

      const entryIds = (entries ?? []).map((e) => e.id);
      if (entryIds.length === 0) return { ...l, pendingSettlement: null };

      const { data: settlements } = await supabase
        .from("financial_settlements")
        .select("id, amount, settlement_date, entry_id")
        .in("entry_id", entryIds)
        .eq("status", "valido")
        .order("settlement_date", { ascending: false })
        .limit(5);

      if (!settlements || settlements.length === 0) return { ...l, pendingSettlement: null };

      const settlementIds = settlements.map((s) => s.id);
      const { data: receipts } = await supabase.from("rent_receipts").select("settlement_id").in("settlement_id", settlementIds);
      const receiptedIds = new Set((receipts ?? []).map((r) => r.settlement_id));

      const pending = settlements.find((s) => !receiptedIds.has(s.id));
      return { ...l, pendingSettlement: pending ?? null };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Locatários</h1>
        <p className="text-sm text-ink-soft">
          Contrapartes cadastradas como locatário. Para adicionar um novo, use{" "}
          <Link href="/cadastros/contrapartes" className="text-brand-accent hover:underline">
            Contrapartes
          </Link>{" "}
          e marque o tipo "Locatário".
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Nome</th>
                <th className="py-2 pr-4 font-medium">Documento</th>
                <th className="py-2 pr-4 font-medium">Contato</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {withPendingReceipts.map((l) => (
                <tr key={l.id} className="border-b border-base-border last:border-0">
                  <td className="py-2 pr-4 text-ink">{l.name}</td>
                  <td className="py-2 pr-4 text-ink-soft">{l.document_number ?? "—"}</td>
                  <td className="py-2 pr-4 text-ink-soft">{l.email ?? l.phone ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="py-2 pr-4">
                    {l.pendingSettlement ? (
                      <Link
                        href={`/recibos/novo?settlement=${l.pendingSettlement.id}`}
                        className="text-sm font-medium text-brand-accent hover:underline"
                      >
                        Emitir recibo ({formatCurrency(l.pendingSettlement.amount)} em{" "}
                        {formatDate(l.pendingSettlement.settlement_date)})
                      </Link>
                    ) : (
                      <span className="text-xs text-ink-faint">Sem recebimentos pendentes de recibo</span>
                    )}
                  </td>
                </tr>
              ))}
              {withPendingReceipts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-faint">
                    Nenhum locatário cadastrado.
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
