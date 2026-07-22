import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { toCsv } from "@/lib/export/csv";
import { buildWorkbook } from "@/lib/export/xlsx";
import { formatDateBR, formatNumberBR, exportFileName } from "@/lib/export/format";
import { ENTRY_STATUS_LABELS } from "@/lib/labels/lancamentos";
import { fileResponse, XLSX_MIME, CSV_MIME } from "@/lib/export/response";

export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["em_aberto", "agendado", "parcialmente_pago", "parcialmente_recebido"];

/**
 * Exportação de contas a pagar / contas a receber.
 *
 * GET /api/export/lancamentos?type=despesa|receita&format=csv|xlsx&q=...&status=...
 *
 * - Usa o cliente autenticado por cookies: RLS continua valendo integralmente.
 * - Respeita os MESMOS filtros da tela (busca e status), replicando a query
 *   da listagem — o arquivo exportado é sempre o que o usuário está vendo.
 * - Exige a permissão 'exportar_relatorios'.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!(await hasPermission("exportar_relatorios"))) {
    return NextResponse.json({ error: "Você não tem permissão para exportar relatórios." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const type = params.get("type") === "receita" ? "receita" : "despesa";
  const format = params.get("format") === "xlsx" ? "xlsx" : "csv";
  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("financial_entries")
    .select(
      "description, original_amount, issue_date, competence_date, due_date, status, document_number, notes, counterparties(name), chart_account_categories(name), cost_centers(name)"
    )
    .eq("type", type)
    .order("due_date", { ascending: true });

  if (q) query = query.ilike("description", `%${q}%`);
  if (status === "vencido") {
    query = query.in("status", OPEN_STATUSES).lt("due_date", today);
  } else if (status) {
    query = query.eq("status", status);
  }

  const { data: entries, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Não foi possível gerar a exportação." }, { status: 500 });
  }

  const headers = [
    "Descrição",
    "Contraparte",
    "Categoria",
    "Centro de custo",
    "Nº documento",
    "Emissão",
    "Competência",
    "Vencimento",
    "Valor (R$)",
    "Status",
    "Observações",
  ];

  const isOverdue = (e: any) => OPEN_STATUSES.includes(e.status) && e.due_date && e.due_date < today;

  const baseRows = (entries ?? []).map((e: any) => ({
    text: [
      e.description,
      e.counterparties?.name ?? "",
      e.chart_account_categories?.name ?? "",
      e.cost_centers?.name ?? "",
      e.document_number ?? "",
      formatDateBR(e.issue_date),
      formatDateBR(e.competence_date),
      formatDateBR(e.due_date),
    ],
    amount: Number(e.original_amount),
    status: isOverdue(e) ? "Vencido" : ENTRY_STATUS_LABELS[e.status] ?? e.status,
    notes: e.notes ?? "",
  }));

  const slug = type === "despesa" ? "contas-a-pagar" : "contas-a-receber";
  const count = baseRows.length;

  await logAudit({
    action: "exportar",
    entity: "exportacao",
    metadata: { tela: slug, formato: format, filtros: { q: q || null, status: status || null }, linhas: count },
  });

  if (format === "xlsx") {
    const bytes = await buildWorkbook([
      {
        name: type === "despesa" ? "Contas a pagar" : "Contas a receber",
        headers,
        rows: baseRows.map((r) => [...r.text, r.amount, r.status, r.notes]),
        currencyColumns: [8],
      },
    ]);
    return fileResponse(bytes, exportFileName(slug, "xlsx"), XLSX_MIME);
  }

  const csv = toCsv(
    headers,
    baseRows.map((r) => [...r.text, formatNumberBR(r.amount), r.status, r.notes])
  );
  return fileResponse(csv, exportFileName(slug, "csv"), CSV_MIME);
}
