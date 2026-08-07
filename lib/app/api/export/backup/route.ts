import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { buildWorkbook, type SheetSpec } from "@/lib/export/xlsx";
import { exportFileName } from "@/lib/export/format";
import { fileResponse, XLSX_MIME } from "@/lib/export/response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Backup completo dos dados em uma única planilha Excel (uma aba por tabela).
 *
 * GET /api/export/backup
 *
 * - Restrito ao papel administrador (não basta 'exportar_relatorios').
 * - Usa o cliente autenticado: RLS continua valendo — o backup contém apenas
 *   o que o próprio administrador consegue enxergar.
 * - Este arquivo serve como cópia de segurança legível dos DADOS. A
 *   restauração é um procedimento manual documentado no README (seção
 *   "Backup e restauração") — a estrutura do banco é recriada pelas
 *   migrations, nunca pelo backup.
 */

const TABLES: Array<{ table: string; sheet: string; orderBy?: string }> = [
  { table: "chart_account_families", sheet: "Famílias" },
  { table: "chart_account_categories", sheet: "Categorias" },
  { table: "chart_account_subcategories", sheet: "Subcategorias" },
  { table: "cost_centers", sheet: "Centros de custo" },
  { table: "bank_accounts", sheet: "Contas bancárias" },
  { table: "counterparties", sheet: "Contrapartes" },
  { table: "payment_methods", sheet: "Formas de pagamento" },
  { table: "financial_entries", sheet: "Lançamentos", orderBy: "created_at" },
  { table: "financial_settlements", sheet: "Liquidações", orderBy: "created_at" },
  { table: "transfers", sheet: "Transferências", orderBy: "transfer_date" },
  { table: "bank_balance_snapshots", sheet: "Saldos informados" },
  { table: "installment_groups", sheet: "Parcelamentos" },
  { table: "recurring_rules", sheet: "Recorrências" },
  { table: "bank_transactions", sheet: "Extrato importado (OFX)", orderBy: "transaction_date" },
  { table: "rent_receipts", sheet: "Recibos de aluguel" },
  { table: "report_configs", sheet: "Config. de relatórios" },
  { table: "organization_settings", sheet: "Configurações" },
];

const PAGE_SIZE = 1000;
const MAX_ROWS_PER_TABLE = 50000;

async function fetchAllRows(supabase: any, table: string, orderBy?: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let fromIndex = 0; fromIndex < MAX_ROWS_PER_TABLE; fromIndex += PAGE_SIZE) {
    let query = supabase.from(table).select("*").range(fromIndex, fromIndex + PAGE_SIZE - 1);
    if (orderBy) query = query.order(orderBy, { ascending: true });
    const { data, error } = await query;
    if (error) throw new Error(`Falha ao ler a tabela ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function toSheet(sheetName: string, rows: Record<string, unknown>[]): SheetSpec {
  if (rows.length === 0) {
    return { name: sheetName, headers: ["(tabela vazia)"], rows: [] };
  }
  const headers = Object.keys(rows[0]);
  return {
    name: sheetName,
    headers,
    rows: rows.map((row) =>
      headers.map((key) => {
        const value = row[key];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return JSON.stringify(value);
        return value as string | number;
      })
    ),
  };
}

export async function GET() {
  const supabase = createClient();
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (profile.role_key !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem gerar o backup completo." }, { status: 403 });
  }

  try {
    const sheets: SheetSpec[] = [];
    for (const spec of TABLES) {
      const rows = await fetchAllRows(supabase, spec.table, spec.orderBy);
      sheets.push(toSheet(spec.sheet, rows));
    }

    await logAudit({
      action: "exportar",
      entity: "backup",
      metadata: { tabelas: TABLES.length },
    });

    const bytes = await buildWorkbook(sheets);
    return fileResponse(bytes, exportFileName("backup-completo", "xlsx"), XLSX_MIME);
  } catch (err) {
    console.error("Falha ao gerar backup:", err);
    return NextResponse.json(
      { error: "Não foi possível gerar o backup. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
