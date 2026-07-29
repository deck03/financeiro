import { describe, it, expect } from "vitest";
import { normalizeTransactionDescription } from "@/lib/finance/description-normalize";
import { suggestionKey } from "@/lib/conciliacao/suggestions";

describe("Melhoria — sugestão automática na conciliação bancária", () => {
  describe("normalizeTransactionDescription", () => {
    it("remove números (datas, referências, valores) que mudam a cada transação", () => {
      expect(normalizeTransactionDescription("SABESP 0001234")).toBe("SABESP");
      expect(normalizeTransactionDescription("PIX RECEBIDO JOAO SILVA 20/07")).toBe(
        "PIX RECEBIDO JOAO SILVA"
      );
    });

    it("duas transações da mesma origem, em datas diferentes, normalizam igual quando só o número muda", () => {
      const a = normalizeTransactionDescription("SABESP REF 0001234");
      const b = normalizeTransactionDescription("SABESP REF 0009876");
      expect(a).toBe(b);
      expect(a).toBe("SABESP REF");
    });

    it("ignora diferenças de acentuação e caixa", () => {
      const a = normalizeTransactionDescription("Pagamento Água");
      const b = normalizeTransactionDescription("PAGAMENTO AGUA");
      expect(a).toBe(b);
    });

    it("normaliza espaços múltiplos e remove pontuação", () => {
      expect(normalizeTransactionDescription("PIX  -  RECEBIDO,  JOAO")).toBe("PIX RECEBIDO JOAO");
    });

    it("retorna string vazia para uma descrição sem nenhuma letra", () => {
      expect(normalizeTransactionDescription("00012345")).toBe("");
    });
  });

  describe("suggestionKey", () => {
    it("usa 'receita' para valores positivos e 'despesa' para negativos", () => {
      expect(suggestionKey("Aluguel recebido", 1500)).toBe("receita|ALUGUEL RECEBIDO");
      expect(suggestionKey("SABESP", -75.5)).toBe("despesa|SABESP");
    });

    it("a mesma origem em datas diferentes gera a mesma chave (é o objetivo da sugestão)", () => {
      const key1 = suggestionKey("SABESP REF 0001234", -75.5);
      const key2 = suggestionKey("SABESP REF 0009876", -80.1);
      expect(key1).toBe(key2);
    });

    it("uma receita e uma despesa com a mesma descrição nunca colidem (tipo faz parte da chave)", () => {
      const receita = suggestionKey("TRANSFERENCIA SOCIO", 500);
      const despesa = suggestionKey("TRANSFERENCIA SOCIO", -500);
      expect(receita).not.toBe(despesa);
    });
  });
});
