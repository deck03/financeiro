import { describe, it, expect } from "vitest";
import { installmentPlanSchema, recurringRuleSchema } from "@/lib/validation/lancamentos";

const baseInstallment = {
  type: "despesa",
  description: "Reforma do vestiário",
  category_id: "11111111-1111-1111-1111-111111111111",
  total_amount: "1200",
  installments_count: "3",
  first_due_date: "2026-08-05",
};

const baseRecurring = {
  type: "despesa",
  description: "Internet — mensalidade",
  category_id: "11111111-1111-1111-1111-111111111111",
  amount: "199.9",
  frequency: "mensal",
  start_date: "2026-08-01",
};

describe("Ajuste — data de competência em parcelamentos", () => {
  it("exige data de competência quando o reconhecimento é 'competencia_original'", () => {
    const result = installmentPlanSchema.safeParse({
      ...baseInstallment,
      recognition_strategy: "competencia_original",
      // competence_date ausente
    });
    expect(result.success).toBe(false);
  });

  it("aceita quando a data de competência é informada com 'competencia_original'", () => {
    const result = installmentPlanSchema.safeParse({
      ...baseInstallment,
      recognition_strategy: "competencia_original",
      competence_date: "2026-08-01",
    });
    expect(result.success).toBe(true);
  });

  it("não exige data de competência para 'por_parcela' ou 'conforme_pagamento'", () => {
    for (const strategy of ["por_parcela", "conforme_pagamento"]) {
      const result = installmentPlanSchema.safeParse({
        ...baseInstallment,
        recognition_strategy: strategy,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("Ajuste — âncora de competência em recorrências", () => {
  it("aceita a recorrência sem âncora de competência (comportamento anterior)", () => {
    const result = recurringRuleSchema.safeParse(baseRecurring);
    expect(result.success).toBe(true);
  });

  it("aceita a recorrência com uma âncora de competência explícita", () => {
    const result = recurringRuleSchema.safeParse({
      ...baseRecurring,
      competence_anchor_date: "2026-07-31",
    });
    expect(result.success).toBe(true);
  });
});
