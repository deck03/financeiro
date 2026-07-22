import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { toCsv } from "@/lib/export/csv";
import { buildWorkbook } from "@/lib/export/xlsx";
import { formatDateBR, formatNumberBR, exportFileName } from "@/lib/export/format";
import { fileResponse, XLSX_MIME, CSV_MIME } from "@/lib/export/response";
import { TRANSFER_CLASSIFICATION_LABELS } from "@/lib/labels/transferencias";

export const dynamic = "force-dynamic";

/**
 * Exportação de transferências.
 *
 * GET /api/export/transferencias?format=csv|xlsx
 *
 * Diferente da tela (limitada às 100 mais recentes), a exportação traz o
 * histórico completo — é justamente o caso de uso de exportar.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!(await hasPermission("exportar_relatorios"))) {
    return NextResponse.json({ error: "Você não tem permissão para exportar relatórios." }, { status: 403 });
  }

  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const { data: transfers, error } = await supabase
    .from("transfers")
    .select(
      "amount, transfer_date, classification, status, notes, from:from_bank_account_id(display_name), to:to_bank_account_id(display_name)"
    )
    .order("transfer_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Não foi possível gerar a exportação." }, { status: 500 });
  }

  const headers = ["Data", "Origem", "Destino", "Classificação", "Status", "Valor (R$)", "Observações"];
  const rows = (transfers ?? []).map((t: any) => ({
    text: [
      formatDateBR(t.transfer_date),
      t.from?.display_name ?? "",
      t.to?.display_name ?? "",
      TRANSFER_CLASSIFICATION_LABELS[t.classification] ?? t.classification,
      t.status === "valido" ? "Válida" : "Estornada",
    ],
    amount: Number(t.amount),
    notes: t.notes ?? "",
  }));

  await logAudit({
    action: "exportar",
    entity: "exportacao",
    metadata: { tela: "transferencias", formato: format, linhas: rows.length },
  });

  if (format === "xlsx") {
    const bytes = await buildWorkbook([
      {
        name: "Transferências",
        headers,
        rows: rows.map((r) => [...r.text, r.amount, r.notes]),
        currencyColumns: [5],
      },
    ]);
    return fileResponse(bytes, exportFileName("transferencias", "xlsx"), XLSX_MIME);
  }

  const csv = toCsv(headers, rows.map((r) => [...r.text, formatNumberBR(r.amount), r.notes]));
  return fileResponse(csv, exportFileName("transferencias", "csv"), CSV_MIME);
}
