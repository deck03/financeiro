import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { toCsv } from "@/lib/export/csv";
import { buildWorkbook, type SheetSpec } from "@/lib/export/xlsx";
import { formatDateBR, formatNumberBR, exportFileName } from "@/lib/export/format";
import { fileResponse, XLSX_MIME, CSV_MIME } from "@/lib/export/response";

export const dynamic = "force-dynamic";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dayBefore(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

/**
 * Exportação do fluxo de caixa realizado.
 *
 * GET /api/export/fluxo-realizado?from=...&to=...&personal=1&format=csv|xlsx
 *
 * Replica a MESMA lógica da tela (saldos via bank_account_balance_at,
 * liquidações válidas no período, transferências fora de entradas/saídas).
 * No Excel, gera duas abas: Resumo e Movimentos detalhados.
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

  const canSeePersonal = await hasPermission("visualizar_contas_pessoais");
  const params = request.nextUrl.searchParams;
  const format = params.get("format") === "xlsx" ? "xlsx" : "csv";

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = params.get("from") || toISODate(firstOfMonth);
  const to = params.get("to") || toISODate(today);
  const includePersonal = params.get("personal") === "1" && canSeePersonal;

  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, display_name, ownership")
    .eq("status", "ativa")
    .eq("consider_in_business_dashboard", true);

  const includedAccounts = (accounts ?? []).filter((a) => (includePersonal ? true : a.ownership !== "pessoa_fisica"));
  const accountIds = includedAccounts.map((a) => a.id);

  const [initialBalances, finalBalances] = await Promise.all([
    Promise.all(accountIds.map((id) => supabase.rpc("bank_account_balance_at", { p_account_id: id, p_as_of: dayBefore(from) }))),
    Promise.all(accountIds.map((id) => supabase.rpc("bank_account_balance_at", { p_account_id: id, p_as_of: to }))),
  ]);
  const saldoInicial = initialBalances.reduce((sum, r) => sum + Number(r.data ?? 0), 0);
  const saldoFinal = finalBalances.reduce((sum, r) => sum + Number(r.data ?? 0), 0);

  let movimentos: any[] = [];
  if (accountIds.length > 0) {
    const { data: settlements } = await supabase
      .from("financial_settlements")
      .select(
        "amount, settlement_date, bank_accounts(display_name), financial_entries(type, description, counterparties(name), chart_account_categories(name))"
      )
      .in("bank_account_id", accountIds)
      .eq("status", "valido")
      .gte("settlement_date", from)
      .lte("settlement_date", to)
      .order("settlement_date", { ascending: true });
    movimentos = (settlements ?? []).filter((s: any) => s.financial_entries);
  }

  const totalEntradas = movimentos
    .filter((s) => s.financial_entries.type === "receita")
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const totalSaidas = movimentos
    .filter((s) => s.financial_entries.type === "despesa")
    .reduce((sum, s) => sum + Number(s.amount), 0);

  const resumoHeaders = ["Indicador", "Valor (R$)"];
  const resumoRows: Array<[string, number]> = [
    [`Saldo inicial (${formatDateBR(from)})`, saldoInicial],
    ["Entradas no período", totalEntradas],
    ["Saídas no período", totalSaidas],
    [`Saldo final (${formatDateBR(to)})`, saldoFinal],
  ];

  const movHeaders = ["Data", "Tipo", "Descrição", "Contraparte", "Categoria", "Conta bancária", "Valor (R$)"];
  const movRows = movimentos.map((s: any) => ({
    text: [
      formatDateBR(s.settlement_date),
      s.financial_entries.type === "receita" ? "Entrada" : "Saída",
      s.financial_entries.description ?? "",
      s.financial_entries.counterparties?.name ?? "",
      s.financial_entries.chart_account_categories?.name ?? "",
      s.bank_accounts?.display_name ?? "",
    ],
    amount: Number(s.amount),
  }));

  await logAudit({
    action: "exportar",
    entity: "exportacao",
    metadata: {
      tela: "fluxo-realizado",
      formato: format,
      filtros: { from, to, incluirPessoais: includePersonal },
      linhas: movRows.length,
    },
  });

  if (format === "xlsx") {
    const sheets: SheetSpec[] = [
      { name: "Resumo", headers: resumoHeaders, rows: resumoRows, currencyColumns: [1] },
      {
        name: "Movimentos",
        headers: movHeaders,
        rows: movRows.map((r) => [...r.text, r.amount]),
        currencyColumns: [6],
      },
    ];
    const bytes = await buildWorkbook(sheets);
    return fileResponse(bytes, exportFileName("fluxo-realizado", "xlsx"), XLSX_MIME);
  }

  // CSV: resumo no topo, linha em branco, depois os movimentos.
  const resumoCsvRows = resumoRows.map(([label, value]) => [label, formatNumberBR(value)]);
  const csvBody =
    toCsv(resumoHeaders, resumoCsvRows) +
    "\r\n" +
    toCsv(movHeaders, movRows.map((r) => [...r.text, formatNumberBR(r.amount)])).replace(/^\uFEFF/, "");
  return fileResponse(csvBody, exportFileName("fluxo-realizado", "csv"), CSV_MIME);
}
