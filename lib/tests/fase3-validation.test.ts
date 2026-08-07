import { describe, expect, it } from "vitest";
import { entrySchema, settleSchema, cancelSchema } from "@/lib/validation/lancamentos";

const validCategoryId = "123e4567-e89b-12d3-a456-426614174000";

describe("entrySchema", () => {
  it("aceita um lançamento mínimo válido", () => {
    const result = entrySchema.safeParse({
      type: "despesa",
      description: "Conta de energia",
      category_id: validCategoryId,
      original_amount: "150.50",
      due_date: "2026-08-10",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita valor zero ou negativo", () => {
    const result = entrySchema.safeParse({
      type: "despesa",
      description: "Teste",
      category_id: validCategoryId,
      original_amount: "0",
      due_date: "2026-08-10",
    });
    expect(result.success).toBe(false);
  });

  it("exige categoria válida", () => {
    const result = entrySchema.safeParse({
      type: "despesa",
      description: "Teste",
      category_id: "não-uuid",
      original_amount: "100",
      due_date: "2026-08-10",
    });
    expect(result.success).toBe(false);
  });

  it("exige data de vencimento", () => {
    const result = entrySchema.safeParse({
      type: "receita",
      description: "Teste",
      category_id: validCategoryId,
      original_amount: "100",
      due_date: "",
    });
    expect(result.success).toBe(false);
  });

  it("aceita tipo receita ou despesa apenas", () => {
    const result = entrySchema.safeParse({
      type: "transferencia",
      description: "Teste",
      category_id: validCategoryId,
      original_amount: "100",
      due_date: "2026-08-10",
    });
    expect(result.success).toBe(false);
  });
});

describe("settleSchema", () => {
  it("aceita uma liquidação válida", () => {
    const result = settleSchema.safeParse({
      entry_id: validCategoryId,
      bank_account_id: validCategoryId,
      settlement_date: "2026-08-01",
    });
    expect(result.success).toBe(true);
  });

  it("exige conta bancária", () => {
    const result = settleSchema.safeParse({
      entry_id: validCategoryId,
      bank_account_id: "",
      settlement_date: "2026-08-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("cancelSchema", () => {
  it("aceita cancelamento sem motivo", () => {
    const result = cancelSchema.safeParse({ entry_id: validCategoryId });
    expect(result.success).toBe(true);
  });
});
