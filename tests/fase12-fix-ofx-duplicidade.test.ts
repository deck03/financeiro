import { describe, it, expect } from "vitest";
import { transactionHash } from "@/lib/ofx/hash";

/**
 * Correção: transações "não conciliadas" duplicando entre importações de
 * OFX, quando o banco não gera um FITID estável entre exportações (a mesma
 * transação real recebe um FITID diferente a cada arquivo baixado).
 *
 * A lógica corrigida em previewOfxImportAction/confirmOfxImportAction passa
 * a considerar uma transação duplicada se o FITID OU o hash já existirem —
 * antes, com FITID presente, só o FITID era checado. Este teste documenta
 * a parte determinística e testável em TypeScript puro: o hash continua
 * igual para a mesma transação real, mesmo que o FITID mude.
 */
describe("Correção — duplicidade de transações OFX quando o FITID não é estável", () => {
  it("simula a mesma transação real exportada duas vezes com FITID diferente: o hash é igual", () => {
    const exportacao1 = {
      fitid: "FITID-GERADO-2026-07-20-A1B2",
      hash: transactionHash("acc-1", "2026-07-20", -75.5, "SABESP REF 0001234"),
    };
    const exportacao2 = {
      fitid: "FITID-GERADO-2026-08-05-C3D4", // o banco gerou um FITID diferente
      hash: transactionHash("acc-1", "2026-07-20", -75.5, "SABESP REF 0001234"),
    };

    expect(exportacao1.fitid).not.toBe(exportacao2.fitid);
    // ... mas o hash (conta + data + valor + descrição) continua igual —
    // é essa igualdade que a correção passou a usar como segundo critério,
    // mesmo quando as duas transações têm FITID preenchido.
    expect(exportacao1.hash).toBe(exportacao2.hash);
  });

  it("duas transações genuinamente diferentes continuam com hashes diferentes", () => {
    const a = transactionHash("acc-1", "2026-07-20", -75.5, "SABESP REF 0001234");
    const b = transactionHash("acc-1", "2026-08-20", -75.5, "SABESP REF 0009876");
    expect(a).not.toBe(b);
  });

  it("simula a regra de duplicidade combinada (FITID novo, mas hash já existente = duplicata)", () => {
    function isDuplicate(
      transaction: { fitid: string | null; hash: string },
      existingFitids: Set<string>,
      existingHashes: Set<string>
    ): boolean {
      return (!!transaction.fitid && existingFitids.has(transaction.fitid)) || existingHashes.has(transaction.hash);
    }

    const hash = transactionHash("acc-1", "2026-07-20", -75.5, "SABESP REF 0001234");
    const existingFitids = new Set(["FITID-ANTIGO"]);
    const existingHashes = new Set([hash]);

    // FITID novo (nunca visto), mas o hash já existe -> ainda é duplicata.
    const novaTransacaoComFitidDiferente = { fitid: "FITID-NOVO-NUNCA-VISTO", hash };
    expect(isDuplicate(novaTransacaoComFitidDiferente, existingFitids, existingHashes)).toBe(true);

    // Transação genuinamente nova (nem FITID nem hash batem).
    const transacaoRealmenteNova = {
      fitid: "FITID-NOVO-NUNCA-VISTO",
      hash: transactionHash("acc-1", "2026-09-20", -80, "OUTRA COISA"),
    };
    expect(isDuplicate(transacaoRealmenteNova, existingFitids, existingHashes)).toBe(false);
  });
});
