import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { DreFilter } from "./dre-filter";
import { DreConsolidatedTree } from "./dre-tree";
import { buildDRE } from "@/lib/finance/dre";
import { fetchClassifiedItems, fetchPartnerTransfers, type Regime } from "@/lib/finance/dre-query";
import { formatCurrency, formatDate, monthRange, quarterRange, toISODate } from "@/lib/finance/period";
import Link from "next/link";
import { ExportButtons } from "@/components/export-buttons";
import { mergeSociosLines } from "@/lib/finance/dre-socios";

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
  const canExport = await hasPermission("exportar_relatorios");

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

  // Mescla transferências de sócio/pessoa física (Fase 4) na mesma seção.
  // Regra extraída para lib/finance/dre-socios.ts na Fase 12, compartilhada
  // com a exportação (/api/export/dre) — uma única implementação.
  const socios = mergeSociosLines(dre, transfers);
  const combinedSocios = new Map<string, number>(socios.lines.map((l) => [l.label, l.total]));
  const combinedSociosTotal = socios.total;

  function detailHref(params: Record<string, string>) {
    const p = new URLSearchParams({ regime, from, to, ...params });
    return `/dre/detalhe?${p.toString()}`;
  }

  // Alternador "só pagas/recebidas" (regime de caixa) vs. "tudo" (regime
  // de competência) — reaproveita o parâmetro "regime" que já existe,
  // preservando o período atual na URL.
  function regimeHref(newRegime: Regime) {
    const p = new URLSearchParams();
    p.set("regime", newRegime);
    p.set("period", periodType);
    if (periodType === "trimestral") {
      p.set("year", String(year));
      p.set("quarter", String(quarter));
    } else if (periodType === "personalizado") {
      p.set("from", from);
      p.set("to", to);
    } else {
      p.set("year", String(year));
      p.set("month", String(month));
    }
    return `/dre?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">DRE gerencial</h1>
          <p className="text-sm text-ink-soft">
            {periodLabel} · {regime === "caixa" ? "Regime de caixa" : "Regime de competência"}
          </p>
        </div>

        {/* Alternador simples: ligado = só contas pagas/recebidas (regime
            de caixa); desligado = considera tudo, inclusive em aberto
            (regime de competência). */}
        <div className="inline-flex items-center gap-2 rounded-card border border-base-border bg-base-surface p-1 text-sm">
          <Link
            href={regimeHref("caixa")}
            className={`rounded-card px-3 py-1.5 font-medium transition-colors ${
              regime === "caixa" ? "bg-brand-accent text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            Só pagas/recebidas
          </Link>
          <Link
            href={regimeHref("competencia")}
            className={`rounded-card px-3 py-1.5 font-medium transition-colors ${
              regime === "competencia" ? "bg-brand-accent text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            Considerar tudo
          </Link>
        </div>
      </div>

      <Card>
        {canExport && (
          <div className="mb-3 flex justify-end">
            <ExportButtons
              options={(() => {
                const qs = new URLSearchParams({ regime, from, to });
                return [
                  { label: "Exportar CSV", href: `/api/export/dre?${qs.toString()}&format=csv` },
                  { label: "Exportar PDF", href: `/api/export/dre?${qs.toString()}&format=pdf` },
                ];
              })()}
            />
          </div>
        )}
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
        <div className="mb-1">
          <DreLine label="Receitas operacionais" value={dre.receitaOperacional} bold />
          <p className="mb-1 pl-2 text-xs text-ink-faint">Clique numa família ou categoria para ver as subcategorias.</p>
          <DreConsolidatedTree nodes={dre.receitaOperacionalTree} />
        </div>

        <div className="mt-4">
          <p className="pt-2 text-xs font-medium uppercase tracking-wide text-ink-faint">Despesas operacionais</p>
          <DreConsolidatedTree nodes={dre.despesasOperacionaisTree} negative />
          {dre.despesasOperacionaisTree.length === 0 && (
            <p className="pl-2 py-2 text-sm text-ink-faint">Nenhuma despesa operacional no período.</p>
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
