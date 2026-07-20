"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { reportConfigSchema, parseRecipients } from "@/lib/validation/relatorios";
import { sendReport, type ReportType } from "@/lib/reports/send";
import { revalidatePath } from "next/cache";

export type FormState = { error?: string; success?: boolean };

async function getOrgIdAndUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user!.id).single();
  return { supabase, userId: user!.id, organizationId: profile!.organization_id };
}

export async function saveReportConfigAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("alterar_configuracoes");
  } catch {
    return { error: "Você não tem permissão para configurar relatórios." };
  }

  const parsed = reportConfigSchema.safeParse({
    report_type: formData.get("report_type"),
    enabled: formData.get("enabled") === "on",
    recipients: formData.get("recipients"),
    day_of_week: formData.get("day_of_week"),
    day_of_month: formData.get("day_of_month"),
    send_hour: formData.get("send_hour"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const data = parsed.data;
  const recipients = parseRecipients(data.recipients || "");

  if (data.enabled && recipients.length === 0) {
    return { error: "Informe ao menos um destinatário para ativar o envio automático." };
  }

  const { supabase, userId, organizationId } = await getOrgIdAndUser();

  const { error } = await supabase.from("report_configs").upsert(
    {
      organization_id: organizationId,
      report_type: data.report_type,
      enabled: data.enabled ?? false,
      recipients,
      day_of_week: data.report_type === "semanal" && data.day_of_week ? Number(data.day_of_week) : null,
      day_of_month: data.report_type === "mensal" && data.day_of_month ? Number(data.day_of_month) : null,
      send_hour: data.send_hour,
      updated_by: userId,
    },
    { onConflict: "organization_id,report_type" }
  );

  if (error) return { error: "Não foi possível salvar a configuração." };

  revalidatePath("/relatorios");
  return { success: true };
}

export async function sendReportNowAction(reportType: ReportType) {
  const { supabase, userId, organizationId } = await getOrgIdAndUser();

  const { data: config } = await supabase
    .from("report_configs")
    .select("id, recipients")
    .eq("organization_id", organizationId)
    .eq("report_type", reportType)
    .maybeSingle();

  const recipients = config?.recipients ?? [];

  await sendReport(supabase, organizationId, reportType, recipients, "manual", config?.id ?? null, userId);
  revalidatePath("/relatorios");
}
