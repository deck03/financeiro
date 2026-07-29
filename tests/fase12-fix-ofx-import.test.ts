import { describe, it, expect } from "vitest";
import { transactionHash } from "@/lib/ofx/hash";

/**
 * Correção crítica: nenhuma transação OFX estava sendo gravada, porque os
 * índices únicos usados para deduplicar (FITID e hash) eram parciais, e o
 * Postgres não aceita `ON CONFLICT (colunas)` contra um índice parcial sem
 * repetir o predicado — o `upsert` da aplicação não tem como fazer isso, e o
 * erro resultante estava sendo silenciosamente descartado no código.
 *
 * A correção em si é de banco (migration 0014: índices não-parciais, com uma
 * coluna gerada `hash_dedupe_key` para preservar a regra "só deduplicar por
 * hash quando não há FITID" sem precisar de índice parcial) — não há como
 * testar isso com vitest (não há um Postgres neste projeto de testes). Estes
 * testes cobrem a metade que É testável em TypeScript puro: a função de hash
 * continua determinística e sensível aos campos certos, e documentam por que
 * a chave "hash_dedupe_key" só existe quando o FITID está ausente.
 */
describe("Correção — importação OFX não gravava nenhuma transação", () => {
  it("o hash é determinístico: mesma conta/data/valor/descrição sempre gera o mesmo hash", () => {
    const a = transactionHash("acc-1", "2026-07-20", 150.5, "PIX RECEBIDO");
    const b = transactionHash("acc-1", "2026-07-20", 150.5, "PIX RECEBIDO");
    expect(a).toBe(b);
  });

  it("qualquer campo diferente muda o hash (evita colisão indevida)", () => {
    const base = transactionHash("acc-1", "2026-07-20", 150.5, "PIX RECEBIDO");
    expect(transactionHash("acc-2", "2026-07-20", 150.5, "PIX RECEBIDO")).not.toBe(base);
    expect(transactionHash("acc-1", "2026-07-21", 150.5, "PIX RECEBIDO")).not.toBe(base);
    expect(transactionHash("acc-1", "2026-07-20", 150.51, "PIX RECEBIDO")).not.toBe(base);
    expect(transactionHash("acc-1", "2026-07-20", 150.5, "PIX ENVIADO")).not.toBe(base);
  });

  it("é insensível a maiúsculas/minúsculas e espaços nas pontas da descrição", () => {
    const a = transactionHash("acc-1", "2026-07-20", 150.5, "  Pix Recebido  ");
    const b = transactionHash("acc-1", "2026-07-20", 150.5, "pix recebido");
    expect(a).toBe(b);
  });

  it(
    "documenta a regra que a coluna gerada hash_dedupe_key implementa no banco: " +
      "o hash só deve valer como chave de deduplicação quando não há FITID — " +
      "quando há FITID, é ele (não o hash) quem garante unicidade",
    () => {
      // Simula a expressão SQL: case when ofx_transaction_id is null then transaction_hash else null end
      function hashDedupeKey(ofxTransactionId: string | null, hash: string): string | null {
        return ofxTransactionId === null ? hash : null;
      }

      const hash = transactionHash("acc-1", "2026-07-20", 150.5, "PIX RECEBIDO");

      // Sem FITID: a chave de deduplicação por hash é o próprio hash.
      expect(hashDedupeKey(null, hash)).toBe(hash);

      // Com FITID: a chave fica nula — não participa da unicidade por hash,
      // mesmo que duas transações com FITID diferentes tenham o mesmo hash
      // (mesma data/valor/descrição). Isso é o que evita bloquear
      // transações genuinamente distintas que só coincidem nesses campos.
      expect(hashDedupeKey("FITID-123", hash)).toBeNull();
      expect(hashDedupeKey("FITID-456", hash)).toBeNull();
    }
  );
});
