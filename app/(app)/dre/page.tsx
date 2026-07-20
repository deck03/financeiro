import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { DreFilter } from "./dre-filter";
import { buildDRE } from "@/lib/finance/dre";
import { fetchClassifiedItems, fetchPartnerTransfers, type Regime } from "@/lib/finance/dre-query";
import { formatCurrency, formatDate, monthRange, quarterRange, toISODate } from "@/lib/finance/period";
import { TRANSFER_CLASSIFICATION_LABELS, TRANSFER_CLASSIFICATION_SIGN } from "@/lib/labels/transferencias";
import Link from "next/link";

function DreLine({
  label,
  value,
  bold = false,
  indent = false,
  href,
}: {
  label: string;
  value: number;
  bold?: boolean;
  indent?: boolean;
  href?: string;
}) {
  const content = (
    <div
      className={`flex items-center justify-between py-2 ${indent ? "pl-4" : ""} ${
        bold ? "border-t border-base-border font-semibold text-ink" : "text-ink-soft"
      }`}
    >
      <span className={bold ? "text-ink" : ""}>{label}</span>
      <span className={`num ${bold ? "text-ink" : value < 0 ? "text-signal-negative" : "text-ink"}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:bg-base-bg rounded-card px-2 -mx-2">
        {content}
      </Link>
    );
  }
  return content;
}

export default async function DrePage({
  searchParams,
}: {
  searchParams: {
    regime?: string;
    period?: string;
    year?: string;
    month?: string;
    quarter?: string;
    from?: string;
    to?: string;
  };
}) {
  const supabase = createClient();

  const regime: Regime = searchParams.regime === "competencia" ? "competencia" : "caixa";
  const periodType = (searchParams.period as "mensal" | "trimestral" | "personalizado") || "mensal";

  const today = new Date();
  const year = Number(searchParams.year) || today.getFullYear();
  const month = Number(searchParams.month) || today.getMonth() + 1;
  const quarter = Number(searchParams.quarter) || Math.floor(today.getMonth() / 3) + 1;

  let from: string;
  let to: string;
  let periodLabel: string;

  if (periodType === "trimestral") {
    const range = quarterRange(year, quarter);
    from = range.from;
    to = range.to;
    periodLabel = `${quarter}º trimestre de ${year}`;
  } else if (periodType === "personalizado") {
    from = searchParams.from || toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
    to = searchParams.to || toISODate(today);
    periodLabel = `${formatDate(from)} a ${formatDate(to)}`;
  } else {
    const range = monthRange(year, month);
    from = range.from;
    to = range.to;
    periodLabel = `${range.from.slice(5, 7)}/${year}`;
  }

  const [items, transfers] = await Promise.all([
    fetchClassifiedItems(supabase, regime, from, to),
    fetchPartnerTransfers(supabase, from, to),
  ]);

  const dre = buildDRE(items);

  // Mescla transferências de sócio/pessoa física (Fase 4) na mesma seção
  const transfersByClassification = new Map<string, number>();
  for (const t of transfers) {
    const sign = TRANSFER_CLASSIFICATION_SIGN[t.classification] ?? -1;
    const label = TRANSFER_CLASSIFICATION_LABELS[t.classification] ?? t.classification;
    transfersByClassification.set(label, (transfersByClassification.get(label) ?? 0) + sign * Number(t.amount));
  }
  const combinedSocios = new Map<string, number>();
  for (const line of dre.movimentacoesSocios) combinedSocios.set(line.label, line.total);
  for (const [label, total] of transfersByClassification) {
    combinedSocios.set(label, (combinedSocios.get(label) ?? 0) + total);
  }
  const combinedSociosTotal = Array.from(combinedSocios.values()).reduce((a, b) => a + b, 0);

  function detailHref(params: Record<string, string>) {
    const p = new URLSearchParams({ regime, from, to, ...params });
    return `/dre/detalhe?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">DRE gerencial</h1>
        <p className="text-sm text-ink-soft">
          {periodLabel} · {regime === "caixa" ? "Regime de caixa" : "Regime de competência"}
        </p>
      </div>

      <Card>
        <DreFilter
          regime={regime}
          periodType={periodType}
          year={year}
          month={month}
          quarter={quarter}
          customFrom={periodType === "personalizado" ? from : ""}
          customTo={periodType === "personalizado" ? to : ""}
        />
      </Card>

      <Card>
        <DreLine label="Receitas operacionais" value={dre.receitaOperacional} href={detailHref({ type: "receita", dre_behavior: "incluir_operacional" })} />

        <div className="mt-2">
          <p className="pt-2 text-xs font-medium uppercase tracking-wide text-ink-faint">Despesas operacionais</p>
          {dre.despesasOperacionaisPorFamilia.map((line) => (
            <DreLine
              key={line.key}
              label={line.label}
              value={-line.total}
              indent
              href={detailHref({ type: "despesa", dre_behavior: "incluir_operacional", family: line.label })}
            />
          ))}
          {dre.despesasOperacionaisPorFamilia.length === 0 && (
            <p className="pl-4 py-2 text-sm text-ink-faint">Nenhuma despesa operacional no período.</p>
          )}
        </div>

        <DreLine label="Resultado operacional gerencial" value={dre.resultadoOperacional} bold />

        <div className="mt-4">
          <DreLine
            label="Receitas financeiras"
            value={dre.receitasFinanceiras}
            href={detailHref({ type: "receita", dre_behavior: "fora_resultado", managerial_nature: "financeira" })}
          />
          <DreLine
            label="Despesas financeiras"
            value={-dre.despesasFinanceiras}
            href={detailHref({ type: "despesa", dre_behavior: "fora_resultado", managerial_nature: "financeira" })}
          />
          {dre.outrosResultados !== 0 && <DreLine label="Outros resultados" value={dre.outrosResultados} />}
        </div>

        <DreLine label="Resultado gerencial antes de investimentos" value={dre.resultadoAntesInvestimentos} bold />
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-ink">Investimentos (apresentados separadamente)</h2>
        <DreLine
          label="Investimentos no período"
          value={-dre.investimentos}
          href={detailHref({ type: "despesa", dre_behavior: "fora_resultado", managerial_nature: "investimento" })}
        />
        <p className="mt-1 text-xs text-ink-faint">Não entram no resultado operacional nem no resultado antes de investimentos.</p>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-ink">Movimentações de sócios e pessoa física (apresentadas separadamente)</h2>
        {combinedSocios.size === 0 ? (
          <p className="text-sm text-ink-faint">Nenhuma movimentação de sócio ou pessoa física no período.</p>
        ) : (
          <>
            {Array.from(combinedSocios.entries()).map(([label, total]) => (
              <DreLine key={label} label={label} value={total} />
            ))}
            <DreLine label="Total" value={combinedSociosTotal} bold />
          </>
        )}
        <p className="mt-1 text-xs text-ink-faint">
          Não entram no resultado operacional. Inclui tanto lançamentos quanto transferências
          classificadas como movimentação de sócio (Fase 4).
        </p>
      </Card>
    </div>
  );
}
