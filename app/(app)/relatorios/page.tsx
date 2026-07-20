import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { ReportConfigForm } from "./report-config-form";
import { SendNowButton } from "./send-now-button";

function formatDateTime(value: string) {
  const d = new Date(value);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function RelatoriosPage() {
  const supabase = createClient();
  const canManage = await hasPermission("alterar_configuracoes");

  if (!canManage) {
    return (
      <Card>
        <p className="text-sm text-ink-soft">Você não tem permissão para acessar esta tela.</p>
      </Card>
    );
  }

  const { data: configs } = await supabase.from("report_configs").select("*");
  const weeklyConfig = (configs ?? []).find((c) => c.report_type === "semanal") ?? null;
  const monthlyConfig = (configs ?? []).find((c) => c.report_type === "mensal") ?? null;

  const { data: history } = await supabase
    .from("generated_reports")
    .select("id, report_type, period_start, period_end, recipients, status, error_message, triggered_by, sent_at")
    .order("sent_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Relatórios automáticos</h1>
        <p className="text-sm text-ink-soft">
          Envio semanal (para o administrador acompanhar a qualidade dos dados) e mensal (para o
          CEO).
        </p>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Relatório semanal</h2>
          <SendNowButton reportType="semanal" />
        </div>
        <ReportConfigForm reportType="semanal" config={weeklyConfig} />
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Relatório mensal</h2>
          <SendNowButton reportType="mensal" />
        </div>
        <ReportConfigForm reportType="mensal" config={monthlyConfig} />
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Histórico de envios</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Data</th>
                <th className="py-2 pr-4 font-medium">Tipo</th>
                <th className="py-2 pr-4 font-medium">Período</th>
                <th className="py-2 pr-4 font-medium">Destinatários</th>
                <th className="py-2 pr-4 font-medium">Origem</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(history ?? []).map((h) => (
                <tr key={h.id} className="border-b border-base-border last:border-0">
                  <td className="py-2 pr-4 text-ink-soft">{formatDateTime(h.sent_at)}</td>
                  <td className="py-2 pr-4 text-ink-soft">{h.report_type === "semanal" ? "Semanal" : "Mensal"}</td>
                  <td className="py-2 pr-4 text-ink-soft">
                    {h.period_start === h.period_end ? h.period_start : `${h.period_start} a ${h.period_end}`}
                  </td>
                  <td className="py-2 pr-4 text-ink-soft">{(h.recipients ?? []).join(", ") || "—"}</td>
                  <td className="py-2 pr-4 text-ink-soft">{h.triggered_by === "automatico" ? "Automático" : "Manual"}</td>
                  <td className="py-2 pr-4">
                    {h.status === "enviado" ? (
                      <span className="rounded-full bg-signal-positiveSoft px-2 py-0.5 text-xs text-signal-positive">Enviado</span>
                    ) : (
                      <span
                        title={h.error_message ?? ""}
                        className="cursor-help rounded-full bg-signal-negativeSoft px-2 py-0.5 text-xs text-signal-negative"
                      >
                        Erro
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {(history ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-ink-faint">
                    Nenhum relatório enviado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
