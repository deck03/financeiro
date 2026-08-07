import "server-only";
import type { WeeklyReportData } from "./weekly-data";
import type { MonthlyReportData } from "./monthly-data";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

const WRAPPER_STYLE =
  "font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1C1F26; max-width: 640px; margin: 0 auto;";
const CARD_STYLE = "background: #F7F8FA; border-radius: 8px; padding: 16px; margin-bottom: 12px;";
const LABEL_STYLE = "font-size: 12px; color: #5B6270; text-transform: uppercase; letter-spacing: 0.02em;";
const VALUE_STYLE = "font-size: 20px; font-weight: 600; color: #1C1F26; margin: 4px 0 0;";
const H2_STYLE = "font-size: 15px; font-weight: 600; color: #1C1F26; margin: 24px 0 8px;";

function row(label: string, value: string) {
  return `<tr><td style="padding:4px 0;color:#5B6270;font-size:14px;">${label}</td><td style="padding:4px 0;text-align:right;font-weight:600;font-size:14px;">${value}</td></tr>`;
}

export function renderWeeklyReportHtml(data: WeeklyReportData): string {
  const alerts: string[] = [];
  if (data.overduePayablesCount > 0) alerts.push(`${data.overduePayablesCount} conta(s) a pagar vencida(s): ${formatCurrency(data.overduePayablesTotal)}`);
  if (data.overdueReceivablesCount > 0) alerts.push(`${data.overdueReceivablesCount} conta(s) a receber vencida(s): ${formatCurrency(data.overdueReceivablesTotal)}`);
  if (data.unreconciledCount > 0) alerts.push(`${data.unreconciledCount} transação(ões) bancária(s) ainda não conciliada(s)`);
  if (data.entriesWithoutBankAccount > 0) alerts.push(`${data.entriesWithoutBankAccount} lançamento(s) em aberto sem conta bancária definida`);
  for (const diff of data.balanceDifferences) {
    alerts.push(`Diferença de saldo em "${diff.accountName}": ${formatCurrency(diff.difference)} (conferido em ${formatDate(diff.date)})`);
  }

  return `
  <div style="${WRAPPER_STYLE}">
    <h1 style="font-size: 18px; margin-bottom: 4px;">Relatório semanal — ${data.organizationName}</h1>
    <p style="color:#5B6270; font-size: 13px; margin-top:0;">Gerado em ${formatDate(new Date().toISOString().slice(0, 10))}</p>

    <div style="${CARD_STYLE}">
      <p style="${LABEL_STYLE}">Saldo empresarial disponível</p>
      <p style="${VALUE_STYLE}">${formatCurrency(data.businessBalance)}</p>
    </div>

    <h2 style="${H2_STYLE}">Saldo por conta</h2>
    <table style="width:100%; border-collapse: collapse;">
      ${data.accountBalances.map((a) => row(a.name, formatCurrency(a.balance))).join("")}
    </table>

    ${
      data.personalAccountBalances.length > 0
        ? `<h2 style="${H2_STYLE}">Saldo pessoal (separado do empresarial)</h2>
    <table style="width:100%; border-collapse: collapse;">
      ${data.personalAccountBalances.map((a) => row(a.name, formatCurrency(a.balance))).join("")}
    </table>`
        : ""
    }

    <h2 style="${H2_STYLE}">Caixa projetado</h2>
    <table style="width:100%; border-collapse: collapse;">
      ${row("7 dias", formatCurrency(data.projection7))}
      ${row("30 dias", formatCurrency(data.projection30))}
      ${row("60 dias", formatCurrency(data.projection60))}
      ${row("90 dias", formatCurrency(data.projection90))}
    </table>

    <h2 style="${H2_STYLE}">Próximos 7 dias</h2>
    <table style="width:100%; border-collapse: collapse;">
      ${row("Entradas previstas", formatCurrency(data.entradasProximos7Dias))}
      ${row("Saídas previstas", formatCurrency(data.saidasProximos7Dias))}
    </table>

    ${
      alerts.length > 0
        ? `<h2 style="${H2_STYLE} color:#B3402A;">Alertas</h2>
    <ul style="font-size: 14px; color:#B3402A; padding-left: 18px;">
      ${alerts.map((a) => `<li style="margin-bottom:4px;">${a}</li>`).join("")}
    </ul>`
        : `<p style="font-size:14px; color:#2E6F5E; margin-top:20px;">Nenhum alerta esta semana.</p>`
    }

    ${data.appUrl ? `<p style="margin-top:24px;"><a href="${data.appUrl}/dashboard" style="color:#2E6F5E;">Acessar o sistema →</a></p>` : ""}
  </div>`;
}

export function renderMonthlyReportHtml(data: MonthlyReportData): string {
  const revenueChange = data.previousMonthRevenue !== 0 ? ((data.operatingRevenue - data.previousMonthRevenue) / Math.abs(data.previousMonthRevenue)) * 100 : 0;

  return `
  <div style="${WRAPPER_STYLE}">
    <h1 style="font-size: 18px; margin-bottom: 4px;">Relatório mensal — ${data.organizationName}</h1>
    <p style="color:#5B6270; font-size: 13px; margin-top:0;">Referente a ${data.periodLabel}</p>

    <div style="display:flex; gap:12px;">
      <div style="${CARD_STYLE} flex:1;">
        <p style="${LABEL_STYLE}">Saldo inicial</p>
        <p style="${VALUE_STYLE}">${formatCurrency(data.initialBalance)}</p>
      </div>
      <div style="${CARD_STYLE} flex:1;">
        <p style="${LABEL_STYLE}">Saldo final</p>
        <p style="${VALUE_STYLE}">${formatCurrency(data.finalBalance)}</p>
      </div>
    </div>

    <div style="${CARD_STYLE}">
      <p style="${LABEL_STYLE}">Geração/consumo de caixa no período</p>
      <p style="${VALUE_STYLE} color: ${data.cashGenerated >= 0 ? "#2E6F5E" : "#B3402A"};">${formatCurrency(data.cashGenerated)}</p>
    </div>

    <h2 style="${H2_STYLE}">Resultado do período</h2>
    <table style="width:100%; border-collapse: collapse;">
      ${row("Total de entradas", formatCurrency(data.totalInflows))}
      ${row("Total de saídas", formatCurrency(data.totalOutflows))}
      ${row("Receita operacional gerencial", formatCurrency(data.operatingRevenue))}
      ${row("Resultado operacional gerencial", formatCurrency(data.operatingResult))}
      ${row("Receita vs. mês anterior", `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(0)}%`)}
    </table>

    <h2 style="${H2_STYLE}">Contas a pagar e a receber (situação atual)</h2>
    <table style="width:100%; border-collapse: collapse;">
      ${row("Total a pagar em aberto", formatCurrency(data.payableOpenTotal))}
      ${row("Total a pagar vencido", formatCurrency(data.overduePayablesTotal))}
      ${row("Total a receber em aberto", formatCurrency(data.receivableOpenTotal))}
      ${row("Total a receber vencido", formatCurrency(data.overdueReceivablesTotal))}
      ${row("Inadimplência (contas vencidas a receber)", `${data.overdueReceivablesCount} conta(s)`)}
    </table>

    <h2 style="${H2_STYLE}">Caixa projetado em 30 dias</h2>
    <table style="width:100%; border-collapse: collapse;">
      ${row("Saldo projetado", formatCurrency(data.projectedBalance30))}
    </table>

    ${
      data.topInflows.length > 0
        ? `<h2 style="${H2_STYLE}">Maiores entradas do período</h2>
    <table style="width:100%; border-collapse: collapse;">
      ${data.topInflows.map((i) => row(i.description, formatCurrency(i.amount))).join("")}
    </table>`
        : ""
    }

    ${
      data.topOutflows.length > 0
        ? `<h2 style="${H2_STYLE}">Maiores saídas do período</h2>
    <table style="width:100%; border-collapse: collapse;">
      ${data.topOutflows.map((i) => row(i.description, formatCurrency(i.amount))).join("")}
    </table>`
        : ""
    }

    ${
      data.expensesByCategory.length > 0
        ? `<h2 style="${H2_STYLE}">Principais categorias de despesa</h2>
    <table style="width:100%; border-collapse: collapse;">
      ${data.expensesByCategory.map((c) => row(c.name, formatCurrency(c.total))).join("")}
    </table>`
        : ""
    }

    ${
      data.revenueByCategory.length > 0
        ? `<h2 style="${H2_STYLE}">Principais fontes de receita</h2>
    <table style="width:100%; border-collapse: collapse;">
      ${data.revenueByCategory.map((c) => row(c.name, formatCurrency(c.total))).join("")}
    </table>`
        : ""
    }

    ${
      data.unreconciledCount > 0
        ? `<p style="font-size:14px; color:#B3402A; margin-top:20px;">⚠️ ${data.unreconciledCount} transação(ões) bancária(s) ainda não conciliada(s).</p>`
        : ""
    }

    ${data.appUrl ? `<p style="margin-top:24px;"><a href="${data.appUrl}/dashboard" style="color:#2E6F5E;">Acessar o dashboard →</a></p>` : ""}
  </div>`;
}
