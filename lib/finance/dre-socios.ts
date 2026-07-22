import { TRANSFER_CLASSIFICATION_LABELS, TRANSFER_CLASSIFICATION_SIGN } from "@/lib/labels/transferencias";
import type { DreResult } from "./dre";

export type SociosLine = { label: string; total: number };

type PartnerTransferLike = { classification: string; amount: number | string };

/**
 * Mescla as movimentações de sócios vindas da DRE (lançamentos com
 * dre_behavior = 'nao_incluir') com as transferências de sócio/pessoa física
 * (Fase 4). Extraída da tela de DRE na Fase 12 para que a exportação use
 * exatamente a mesma regra — nunca duas implementações do mesmo número.
 */
export function mergeSociosLines(dre: DreResult, transfers: PartnerTransferLike[]): { lines: SociosLine[]; total: number } {
  const transfersByClassification = new Map<string, number>();
  for (const t of transfers) {
    const sign = TRANSFER_CLASSIFICATION_SIGN[t.classification] ?? -1;
    const label = TRANSFER_CLASSIFICATION_LABELS[t.classification] ?? t.classification;
    transfersByClassification.set(label, (transfersByClassification.get(label) ?? 0) + sign * Number(t.amount));
  }

  const combined = new Map<string, number>();
  for (const line of dre.movimentacoesSocios) combined.set(line.label, line.total);
  for (const [label, total] of transfersByClassification) {
    combined.set(label, (combined.get(label) ?? 0) + total);
  }

  const lines = Array.from(combined.entries()).map(([label, total]) => ({ label, total }));
  const total = lines.reduce((sum, l) => sum + l.total, 0);
  return { lines, total };
}
