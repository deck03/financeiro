import { describe, expect, it } from "vitest";
import { buildDRE } from "@/lib/finance/dre";

describe("buildDRE", () => {
  it("soma receita operacional e despesas operacionais por família", () => {
    const result = buildDRE([
      { type: "receita", amount: 10000, dre_behavior: "incluir_operacional", managerial_nature: "operacional", family_name: "Receitas operacionais" },
      { type: "despesa", amount: 3000, dre_behavior: "incluir_operacional", managerial_nature: "operacional", family_name: "Pessoal e prestadores" },
      { type: "despesa", amount: 1500, dre_behavior: "incluir_operacional", managerial_nature: "operacional", family_name: "Estrutura" },
    ]);

    expect(result.receitaOperacional).toBe(10000);
    expect(result.despesaOperacionalTotal).toBe(4500);
    expect(result.resultadoOperacional).toBe(5500);
    expect(result.despesasOperacionaisPorFamilia).toHaveLength(2);
  });

  it("não mistura receitas/despesas financeiras no resultado operacional", () => {
    const result = buildDRE([
      { type: "receita", amount: 10000, dre_behavior: "incluir_operacional", managerial_nature: "operacional", family_name: "Receitas operacionais" },
      { type: "despesa", amount: 200, dre_behavior: "fora_resultado", managerial_nature: "financeira", family_name: "Financeiro" },
      { type: "receita", amount: 50, dre_behavior: "fora_resultado", managerial_nature: "financeira", family_name: "Receitas financeiras" },
    ]);

    expect(result.resultadoOperacional).toBe(10000);
    expect(result.resultadoFinanceiro).toBe(-150);
    expect(result.resultadoAntesInvestimentos).toBe(9850);
  });

  it("mantém investimentos fora do resultado, mas visíveis separadamente", () => {
    const result = buildDRE([
      { type: "receita", amount: 10000, dre_behavior: "incluir_operacional", managerial_nature: "operacional", family_name: "Receitas operacionais" },
      { type: "despesa", amount: 5000, dre_behavior: "fora_resultado", managerial_nature: "investimento", family_name: "Investimentos" },
    ]);

    expect(result.resultadoOperacional).toBe(10000);
    expect(result.investimentos).toBe(5000);
    expect(result.resultadoAntesInvestimentos).toBe(10000); // investimento não entra aqui
  });

  it("distribuição de lucros e retirada de sócio não entram no resultado operacional", () => {
    const result = buildDRE([
      { type: "receita", amount: 10000, dre_behavior: "incluir_operacional", managerial_nature: "operacional", family_name: "Receitas operacionais" },
      { type: "despesa", amount: 2000, dre_behavior: "nao_incluir", managerial_nature: "movimentacao_socios", family_name: "Distribuição de lucros" },
      { type: "despesa", amount: 1000, dre_behavior: "nao_incluir", managerial_nature: "pessoa_fisica", family_name: "Despesa pessoal" },
    ]);

    expect(result.resultadoOperacional).toBe(10000);
    expect(result.resultadoAntesInvestimentos).toBe(10000);
    expect(result.movimentacoesSociosTotal).toBe(-3000);
    expect(result.movimentacoesSocios).toHaveLength(2);
  });

  it("retorna zeros quando não há itens", () => {
    const result = buildDRE([]);
    expect(result.receitaOperacional).toBe(0);
    expect(result.resultadoOperacional).toBe(0);
    expect(result.despesasOperacionaisPorFamilia).toHaveLength(0);
  });
});
