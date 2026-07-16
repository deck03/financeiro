import { describe, expect, it } from "vitest";
import { chartFamilySchema, chartCategorySchema, chartSubcategorySchema } from "@/lib/validation/plano-de-contas";
import { costCenterSchema } from "@/lib/validation/centros-de-custo";
import { bankAccountSchema } from "@/lib/validation/contas-bancarias";
import { counterpartySchema } from "@/lib/validation/contrapartes";
import { paymentMethodSchema } from "@/lib/validation/formas-pagamento";

describe("chartFamilySchema", () => {
  it("aceita uma família válida", () => {
    const result = chartFamilySchema.safeParse({ name: "Receitas operacionais", type: "receita" });
    expect(result.success).toBe(true);
  });

  it("rejeita tipo inválido", () => {
    const result = chartFamilySchema.safeParse({ name: "Teste", type: "invalido" });
    expect(result.success).toBe(false);
  });

  it("exige nome", () => {
    const result = chartFamilySchema.safeParse({ name: "", type: "receita" });
    expect(result.success).toBe(false);
  });
});

describe("chartCategorySchema", () => {
  const validFamilyId = "123e4567-e89b-12d3-a456-426614174000";

  it("aceita uma categoria válida", () => {
    const result = chartCategorySchema.safeParse({
      family_id: validFamilyId,
      name: "Agregadores",
      managerial_nature: "operacional",
      dre_behavior: "incluir_operacional",
      cashflow_behavior: "operacional",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita family_id que não é uuid", () => {
    const result = chartCategorySchema.safeParse({
      family_id: "não-uuid",
      name: "Agregadores",
      managerial_nature: "operacional",
      dre_behavior: "incluir_operacional",
      cashflow_behavior: "operacional",
    });
    expect(result.success).toBe(false);
  });

  it("garante que distribuição de lucros possa ser marcada fora do resultado operacional", () => {
    const result = chartCategorySchema.safeParse({
      family_id: validFamilyId,
      name: "Distribuição de lucros",
      managerial_nature: "movimentacao_socios",
      dre_behavior: "nao_incluir",
      cashflow_behavior: "socios",
    });
    expect(result.success).toBe(true);
  });
});

describe("chartSubcategorySchema", () => {
  it("exige category_id válido", () => {
    const result = chartSubcategorySchema.safeParse({ category_id: "abc", name: "Wellhub" });
    expect(result.success).toBe(false);
  });
});

describe("costCenterSchema", () => {
  it("aceita nome simples", () => {
    expect(costCenterSchema.safeParse({ name: "Eventos" }).success).toBe(true);
  });
  it("rejeita nome vazio", () => {
    expect(costCenterSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("bankAccountSchema", () => {
  const base = {
    display_name: "C6 – DECK",
    account_type: "conta_corrente",
    ownership: "deck03",
    initial_balance: "0",
    initial_balance_date: "2026-01-01",
  };

  it("aceita uma conta válida", () => {
    expect(bankAccountSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita titularidade inválida", () => {
    const result = bankAccountSchema.safeParse({ ...base, ownership: "empresa_terceira" });
    expect(result.success).toBe(false);
  });

  it("exige data do saldo inicial", () => {
    const result = bankAccountSchema.safeParse({ ...base, initial_balance_date: "" });
    expect(result.success).toBe(false);
  });
});

describe("counterpartySchema", () => {
  it("exige ao menos um tipo", () => {
    const result = counterpartySchema.safeParse({ name: "Wellhub", types: [] });
    expect(result.success).toBe(false);
  });

  it("aceita contraparte com múltiplos tipos", () => {
    const result = counterpartySchema.safeParse({
      name: "João da Silva",
      types: ["socio", "cliente_eventual"],
    });
    expect(result.success).toBe(true);
  });

  it("rejeita e-mail inválido quando informado", () => {
    const result = counterpartySchema.safeParse({
      name: "Fornecedor X",
      types: ["fornecedor"],
      email: "não-e-mail",
    });
    expect(result.success).toBe(false);
  });
});

describe("paymentMethodSchema", () => {
  it("exige nome", () => {
    expect(paymentMethodSchema.safeParse({ name: "" }).success).toBe(false);
    expect(paymentMethodSchema.safeParse({ name: "PIX" }).success).toBe(true);
  });
});
