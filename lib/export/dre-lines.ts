import type { DreResult } from "@/lib/finance/dre";
import type { SociosLine } from "@/lib/finance/dre-socios";

/**
 * Converte o resultado da DRE (buildDRE + mergeSociosLines) em linhas
 * prontas para exportação (CSV e PDF), espelhando exatamente a estrutura,
 * os rótulos e os sinais exibidos na tela de DRE gerencial — a tela e o
 * arquivo exportado nunca podem divergir.
 *
 * Função pura — testada em tests/fase12-export.test.ts.
 */

export type DreExportLine = {
  label: string;
  value: number;
  indent?: number;
  bold?: boolean;
  separator?: boolean;
};

export function buildDreExportLines(
  dre: DreResult,
  socios: { lines: SociosLine[]; total: number }
): DreExportLine[] {
  const lines: DreExportLine[] = [];

  lines.push({ label: "Receitas operacionais", value: dre.receitaOperacional });

  for (const fam of dre.despesasOperacionaisPorFamilia) {
    lines.push({ label: fam.label, value: -fam.total, indent: 1 });
  }

  lines.push({ label: "Resultado operacional gerencial", value: dre.resultadoOperacional, bold: true, separator: true });

  lines.push({ label: "Receitas financeiras", value: dre.receitasFinanceiras });
  lines.push({ label: "Despesas financeiras", value: -dre.despesasFinanceiras });
  if (dre.outrosResultados !== 0) {
    lines.push({ label: "Outros resultados", value: dre.outrosResultados });
  }

  lines.push({
    label: "Resultado gerencial antes de investimentos",
    value: dre.resultadoAntesInvestimentos,
    bold: true,
    separator: true,
  });

  lines.push({ label: "Investimentos no período", value: -dre.investimentos });

  for (const socio of socios.lines) {
    lines.push({ label: socio.label, value: socio.total, indent: 1 });
  }
  lines.push({ label: "Movimentações de sócios (total)", value: socios.total, bold: true });

  return lines;
}
