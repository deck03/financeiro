import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReport } from "@/lib/reports/send";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const weekday = today.getDay(); // 0 = domingo
  const dayOfMonth = today.getDate();

  const { data: configs } = await supabaseAdmin.from("report_configs").select("*").eq("enabled", true);

  const results: { config_id: string; report_type: string; status: string }[] = [];

  for (const config of configs ?? []) {
    const isDue =
      config.report_type === "semanal" ? config.day_of_week === weekday : config.day_of_month === dayOfMonth;

    if (!isDue) continue;

    // Evita reenviar duas vezes no mesmo dia (o cron da Vercel roda uma vez
    // por dia, mas esta checagem protege contra execuções duplicadas).
    const { data: alreadySent } = await supabaseAdmin
      .from("generated_reports")
      .select("id")
      .eq("report_config_id", config.id)
      .gte("sent_at", `${todayISO}T00:00:00Z`)
      .limit(1)
      .maybeSingle();

    if (alreadySent) continue;

    const result = await sendReport(
      supabaseAdmin,
      config.organization_id,
      config.report_type as "semanal" | "mensal",
      config.recipients ?? [],
      "automatico",
      config.id
    );

    results.push({ config_id: config.id, report_type: config.report_type, status: result.success ? "enviado" : "erro" });
  }

  return NextResponse.json({ checked: configs?.length ?? 0, sent: results });
}
