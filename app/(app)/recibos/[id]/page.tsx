import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { DownloadReceiptButton } from "../download-receipt-button";
import { notFound } from "next/navigation";
import Link from "next/link";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function ReciboDetalhePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: receipt } = await supabase
    .from("rent_receipts")
    .select(
      "id, receipt_number_formatted, amount, amount_in_words, payment_date, reference_period, space_description, notes, verification_code, file_path, entry_id, counterparties(name, document_number)"
    )
    .eq("id", params.id)
    .single();

  if (!receipt) notFound();

  const counterparty = receipt.counterparties as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Recibo {receipt.receipt_number_formatted}</h1>
        <p className="text-sm text-ink-soft">{counterparty?.name}</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Valor</p>
            <p className="num mt-0.5 text-lg font-semibold text-ink">{formatCurrency(receipt.amount)}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{receipt.amount_in_words}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Data do recebimento</p>
            <p className="mt-0.5 text-sm text-ink">{formatDate(receipt.payment_date)}</p>
          </div>
          {receipt.reference_period && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Período de referência</p>
              <p className="mt-0.5 text-sm text-ink">{receipt.reference_period}</p>
            </div>
          )}
          {receipt.space_description && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Espaço</p>
              <p className="mt-0.5 text-sm text-ink">{receipt.space_description}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Código de verificação</p>
            <p className="mt-0.5 text-sm text-ink">{receipt.verification_code}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          {receipt.file_path ? (
            <DownloadReceiptButton filePath={receipt.file_path} fileName={`${receipt.receipt_number_formatted}.pdf`} />
          ) : (
            <p className="text-sm text-ink-faint">O PDF ainda não está disponível.</p>
          )}
          <Link href={`/contas-a-receber/${receipt.entry_id}`} className="text-sm text-brand-accent hover:underline">
            Ver lançamento de origem
          </Link>
        </div>
      </Card>
    </div>
  );
}
