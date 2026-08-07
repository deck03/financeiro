import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { buildDRE } from "@/lib/finance/dre";
import { fetchClassifiedItems, fetchPartnerTransfers, type Regime } from "@/lib/finance/dre-query";
import { mergeSociosLines } from "@/lib/finance/dre-socios";
import { buildDreExportLines } from "@/lib/export/dre-lines";
import { toCsv } from "@/lib/export/csv";
import { generateReportPdf } from "@/lib/export/pdf-report";
import { formatDateBR, formatNumberBR, formatCurrencyBR, exportFileName } from "@/lib/export/format";
import { fileResponse, CSV_MIME, PDF_MIME } from "@/lib/export/response";

export const dynamic = "force-dynamic";

/**
 * Exportação da DRE gerencial.
 *
 * GET /api/export/dre?regime=caixa|competencia&from=...&to=...&format=csv|pdf
 *
 * Usa exatamente as mesmas funções da tela (fetchClassifiedItems + buildDRE
 * + mergeSociosLines) — o arquivo nunca pode divergir do que a tela mostra.
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

  const params = request.nextUrl.searchParams;
  const regime: Regime = params.get("regime") === "competencia" ? "competencia" : "caixa";
  const format = params.get("format") === "pdf" ? "pdf" : "csv";

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = params.get("from") || firstOfMonth.toISOString().slice(0, 10);
  const to = params.get("to") || today.toISOString().slice(0, 10);

  const [items, transfers] = await Promise.all([
    fetchClassifiedItems(supabase, regime, from, to),
    fetchPartnerTransfers(supabase, from, to),
  ]);

  const dre = buildDRE(items);
  const socios = mergeSociosLines(dre, transfers);
  const lines = buildDreExportLines(dre, socios);

  const regimeLabel = regime === "caixa" ? "Regime de caixa" : "Regime de competência";
  const periodLabel = `${formatDateBR(from)} a ${formatDateBR(to)}`;

  await logAudit({
    action: "exportar",
    entity: "exportacao",
    metadata: { tela: "dre", formato: format, filtros: { regime, from, to } },
  });

  if (format === "pdf") {
    const { data: settings } = await supabase
      .from("organization_settings")
      .select("display_name")
      .single();

    const bytes = await generateReportPdf({
      organizationName: settings?.display_name ?? "DECK 03",
      title: "DRE gerencial",
      subtitle: `${periodLabel} · ${regimeLabel}`,
      lines: lines.map((l) => ({
        label: l.label,
        value: formatCurrencyBR(l.value),
        indent: l.indent,
        bold: l.bold,
        separator: l.separator,
      })),
      footnote:
        "Documento gerencial, sem valor fiscal. Investimentos e movimentações de sócios são apresentados separadamente e não entram no resultado operacional.",
    });
    return fileResponse(bytes, exportFileName("dre", "pdf"), PDF_MIME);
  }

  const csv = toCsv(
    ["Linha", "Valor (R$)"],
    [
      [`DRE gerencial — ${periodLabel} — ${regimeLabel}`, ""],
      ...lines.map((l) => [`${"  ".repeat(l.indent ?? 0)}${l.label}`, formatNumberBR(l.value)] as [string, string]),
    ]
  );
  return fileResponse(csv, exportFileName("dre", "csv"), CSV_MIME);
}
