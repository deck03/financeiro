import { createHash } from "crypto";

/**
 * Hash usado como identificador alternativo de deduplicação quando o
 * arquivo OFX não traz FITID (identificador único da transação). Duas
 * transações com a mesma conta, data, valor e descrição são tratadas como
 * a mesma transação — uma simplificação aceitável, documentada na entrega
 * da Fase 9: em tese, duas transações genuinamente diferentes mas idênticas
 * nesses quatro campos (raro) seriam tratadas como duplicata.
 */
export function transactionHash(bankAccountId: string, date: string, amount: number, description: string): string {
  const raw = `${bankAccountId}|${date}|${amount.toFixed(2)}|${description.trim().toLowerCase()}`;
  return createHash("sha256").update(raw).digest("hex");
}
