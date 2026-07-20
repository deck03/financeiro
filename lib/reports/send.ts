import "server-only";
import { buildWeeklyReportData } from "./weekly-data";
import { buildMonthlyReportData } from "./monthly-data";
import { renderWeeklyReportHtml, renderMonthlyReportHtml } from "./render-html";
import { emailProvider } from "@/lib/email";

export type ReportType = "semanal" | "mensal";

export async function sendReport(
  supabaseAdmin: any,
  organizationId: string,
  reportType: ReportType,
  recipients: string[],
  triggeredBy: "automatico" | "manual",
  reportConfigId: string | null,
  createdBy: string | null = null
): Promise<{ success: boolean; error?: string }> {
  let html: string;
  let subject: string;
  let periodStart: string;
  let periodEnd: string;

  const today = new Date().toISOString().slice(0, 10);

  if (reportType === "semanal") {
    const data = await buildWeeklyReportData(supabaseAdmin, organizationId);
    html = renderWeeklyReportHtml(data);
    subject = `Relatório semanal — ${data.organizationName}`;
    periodStart = today;
    periodEnd = today;
  } else {
    const data = await buildMonthlyReportData(supabaseAdmin, organizationId);
    html = renderMonthlyReportHtml(data);
    subject = `Relatório mensal — ${data.periodLabel}`;
    periodStart = data.periodStart;
    periodEnd = data.periodEnd;
  }

  const result = recipients.length > 0
    ? await emailProvider.send({ to: recipients, subject, html })
    : { success: false as const, error: "Nenhum destinatário configurado." };

  await supabaseAdmin.from("generated_reports").insert({
    organization_id: organizationId,
    report_config_id: reportConfigId,
    report_type: reportType,
    period_start: periodStart,
    period_end: periodEnd,
    recipients,
    status: result.success ? "enviado" : "erro",
    error_message: result.success ? null : result.error,
    triggered_by: triggeredBy,
    created_by: createdBy,
  });

  return result.success ? { success: true } : { success: false, error: result.error };
}
