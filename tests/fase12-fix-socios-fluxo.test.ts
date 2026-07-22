import { describe, it, expect } from "vitest";
import { splitRealizedItems, sumByCategory, netSignedTotal, sumAmounts } from "@/lib/finance/realized-split";

describe("Ajuste — sócios/PF pagos pela mesma conta empresarial", () => {
  const items = [
    { type: "receita", amount: 1000, categoryName: "Aluguéis recebidos", dreBehavior: "incluir_operacional" },
    { type: "despesa", amount: 300, categoryName: "Pessoal", dreBehavior: "incluir_operacional" },
    { type: "despesa", amount: 50, categoryName: "Tarifas bancárias", dreBehavior: "fora_resultado" },
    // Despesa pessoal paga pela MESMA conta empresarial — deve ficar fora do operacional.
    { type: "despesa", amount: 400, categoryName: "Despesas pessoais sócio A", dreBehavior: "nao_incluir" },
    { type: "receita", amount: 100, categoryName: "Reembolso de sócio", dreBehavior: "nao_incluir" },
  ];

  it("separa itens de sócios/PF dos itens operacionais, independente da conta usada", () => {
    const { operational, partners } = splitRealizedItems(items);
    expect(operational).toHaveLength(3);
    expect(partners).toHaveLength(2);
    expect(partners.every((p) => p.dreBehavior === "nao_incluir")).toBe(true);
  });

  it("mantém 'fora_resultado' (financeiras/investimentos) como operacional — é dinheiro real da empresa", () => {
    const { operational } = splitRealizedItems(items);
    expect(operational.some((i) => i.categoryName === "Tarifas bancárias")).toBe(true);
  });

  it("entradas/saídas operacionais não incluem despesa pessoal paga pela conta da empresa", () => {
    const { operational } = splitRealizedItems(items);
    const saidasOperacionais = sumAmounts(operational.filter((i) => i.type === "despesa"));
    // 300 (Pessoal) + 50 (Tarifas) = 350 — os 400 de despesa pessoal do sócio ficam de fora.
    expect(saidasOperacionais).toBe(350);
  });

  it("calcula o total líquido de sócios/PF corretamente (receita soma, despesa subtrai)", () => {
    const { partners } = splitRealizedItems(items);
    // -400 (despesa pessoal) + 100 (reembolso) = -300
    expect(netSignedTotal(partners)).toBe(-300);
  });

  it("agrupa por categoria somando os valores, do maior para o menor", () => {
    const { operational } = splitRealizedItems(items);
    const porCategoria = sumByCategory(operational.map((i) => ({ categoryName: i.categoryName, amount: i.amount })));
    expect(porCategoria[0]).toEqual({ name: "Aluguéis recebidos", total: 1000 });
  });

  it("respeita o limite quando informado", () => {
    const porCategoria = sumByCategory(
      [
        { categoryName: "A", amount: 10 },
        { categoryName: "B", amount: 30 },
        { categoryName: "C", amount: 20 },
      ],
      2
    );
    expect(porCategoria).toHaveLength(2);
    expect(porCategoria[0].name).toBe("B");
  });

  it("nunca deixa uma despesa pessoal aumentar o total de saídas do fluxo de caixa empresarial", () => {
    const comDespesaPessoal = [...items];
    const semDespesaPessoal = items.filter((i) => i.categoryName !== "Despesas pessoais sócio A");

    const totalCom = sumAmounts(splitRealizedItems(comDespesaPessoal).operational.filter((i) => i.type === "despesa"));
    const totalSem = sumAmounts(splitRealizedItems(semDespesaPessoal).operational.filter((i) => i.type === "despesa"));

    expect(totalCom).toBe(totalSem);
  });
});
