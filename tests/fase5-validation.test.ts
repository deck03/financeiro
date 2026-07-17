import { describe, expect, it } from "vitest";
import {
  settleSchema,
  reverseSettlementSchema,
  installmentPlanSchema,
  recurringRuleSchema,
  cancelRecurringSchema,
} from "@/lib/validation/lancamentos";

const uuid1 = "123e4567-e89b-12d3-a456-426614174000";
const uuid2 = "223e4567-e89b-12d3-a456-426614174000";

describe("settleSchema", () => {
  it("aceita liquidação integral sem valor informado", () => {
    const result = settleSchema.safeParse({
      entry_id: uuid1,
      bank_account_id: uuid2,
      settlement_date: "2026-08-01",
    });
    expect(result.success).toBe(true);
  });

  it("aceita liquidação parcial com encargos", () => {
    const result = settleSchema.safeParse({
      entry_id: uuid1,
      bank_account_id: uuid2,
      settlement_date: "2026-08-01",
      amount: "100.00",
      interest: "5",
      penalty: "2",
      discount: "1",
      addition: "0",
    });
    expect(result.success).toBe(true);
  });
});

describe("reverseSettlementSchema", () => {
  it("exige settlement_id válido", () => {
    expect(reverseSettlementSchema.safeParse({ settlement_id: "abc" }).success).toBe(false);
    expect(reverseSettlementSchema.safeParse({ settlement_id: uuid1 }).success).toBe(true);
  });
});

describe("installmentPlanSchema", () => {
  const base = {
    type: "despesa" as const,
    description: "Reforma",
    category_id: uuid1,
    total_amount: "6000",
    installments_count: "6",
    first_due_date: "2026-08-01",
    recognition_strategy: "por_parcela" as const,
  };

  it("aceita um parcelamento válido", () => {
    expect(installmentPlanSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita menos de 2 parcelas", () => {
    const result = installmentPlanSchema.safeParse({ ...base, installments_count: "1" });
    expect(result.success).toBe(false);
  });

  it("rejeita valor total zero", () => {
    const result = installmentPlanSchema.safeParse({ ...base, total_amount: "0" });
    expect(result.success).toBe(false);
  });
});

describe("recurringRuleSchema", () => {
  const base = {
    type: "despesa" as const,
    description: "Internet",
    category_id: uuid1,
    amount: "250",
    frequency: "mensal" as const,
    start_date: "2026-08-01",
  };

  it("aceita uma recorrência válida", () => {
    expect(recurringRuleSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita frequência inválida", () => {
    const result = recurringRuleSchema.safeParse({ ...base, frequency: "diaria" });
    expect(result.success).toBe(false);
  });

  it("aceita data final e máximo de ocorrências opcionais", () => {
    const result = recurringRuleSchema.safeParse({
      ...base,
      end_date: "2027-08-01",
      max_occurrences: "12",
    });
    expect(result.success).toBe(true);
  });
});

describe("cancelRecurringSchema", () => {
  it("aceita escopo 'toda' sem from_entry_id", () => {
    const result = cancelRecurringSchema.safeParse({ rule_id: uuid1, scope: "toda" });
    expect(result.success).toBe(true);
  });

  it("rejeita escopo inválido", () => {
    const result = cancelRecurringSchema.safeParse({ rule_id: uuid1, scope: "sempre" });
    expect(result.success).toBe(false);
  });
});
