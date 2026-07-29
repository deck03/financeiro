import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { NewReceiptForm } from "../new-receipt-form";
import { formatReferencePeriod } from "@/lib/receipts/reference-period";
import { notFound } from "next/navigation";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function NovoReciboPage({ searchParams }: { searchParams: { settlement?: string } }) {
  const supabase = createClient();
  const settlementId = searchParams.settlement;

  if (!settlementId) notFound();

  const { data: settlement } = await supabase
    .from("financial_settlements")
    .select(
      "id, amount, settlement_date, financial_entries(description, type, due_date, competence_date, counterparties(name))"
    )
    .eq("id", settlementId)
    .single();

  if (!settlement || (settlement.financial_entries as any)?.type !== "receita") notFound();

  // Só um recibo ATIVO bloqueia uma nova emissão — se o recibo anterior foi
  // cancelado, a liquidação está livre para receber um novo.
  const { data: existingReceipt } = await supabase
    .from("rent_receipts")
    .select("id")
    .eq("settlement_id", settlementId)
    .eq("status", "ativo")
    .maybeSingle();

  const entry = settlement.financial_entries as any;
  const suggestedReference = formatReferencePeriod(entry?.competence_date ?? null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Emitir recibo</h1>
        <p className="text-sm text-ink-soft">
          {entry?.description} — {entry?.counterparties?.name ?? "sem contraparte"} — recebido em{" "}
          {formatDate(settlement.settlement_date)} — <span className="num">{formatCurrency(settlement.amount)}</span>
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          {entry?.due_date && <>Vencimento: {formatDate(entry.due_date)} · </>}
          Referência que será usada: {suggestedReference ?? "não foi possível calcular — informe manualmente abaixo"}
        </p>
      </div>

      <Card>
        {existingReceipt ? (
          <p className="text-sm text-ink-soft">
            Já existe um recibo ativo para este recebimento.{" "}
            <a href={`/recibos/${existingReceipt.id}`} className="text-brand-accent hover:underline">
              Ver recibo
            </a>
          </p>
        ) : (
          <NewReceiptForm settlementId={settlementId} suggestedReference={suggestedReference} />
        )}
      </Card>
    </div>
  );
}
