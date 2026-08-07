import { describe, expect, it } from "vitest";
import { transferSchema, balanceSnapshotSchema } from "@/lib/validation/transferencias";

const accountA = "123e4567-e89b-12d3-a456-426614174000";
const accountB = "223e4567-e89b-12d3-a456-426614174000";

describe("transferSchema", () => {
  it("aceita uma transferência válida entre contas diferentes", () => {
    const result = transferSchema.safeParse({
      from_bank_account_id: accountA,
      to_bank_account_id: accountB,
      amount: "500",
      transfer_date: "2026-08-01",
      classification: "transferencia_interna",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita quando origem e destino são a mesma conta", () => {
    const result = transferSchema.safeParse({
      from_bank_account_id: accountA,
      to_bank_account_id: accountA,
      amount: "500",
      transfer_date: "2026-08-01",
      classification: "transferencia_interna",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita classificação inválida", () => {
    const result = transferSchema.safeParse({
      from_bank_account_id: accountA,
      to_bank_account_id: accountB,
      amount: "500",
      transfer_date: "2026-08-01",
      classification: "algo_invalido",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita valor zero", () => {
    const result = transferSchema.safeParse({
      from_bank_account_id: accountA,
      to_bank_account_id: accountB,
      amount: "0",
      transfer_date: "2026-08-01",
      classification: "transferencia_interna",
    });
    expect(result.success).toBe(false);
  });

  it("aceita classificação de retirada de sócio", () => {
    const result = transferSchema.safeParse({
      from_bank_account_id: accountA,
      to_bank_account_id: accountB,
      amount: "1000",
      transfer_date: "2026-08-01",
      classification: "retirada_socio",
    });
    expect(result.success).toBe(true);
  });
});

describe("balanceSnapshotSchema", () => {
  it("aceita uma conferência válida", () => {
    const result = balanceSnapshotSchema.safeParse({
      bank_account_id: accountA,
      snapshot_date: "2026-08-01",
      informed_balance: "1234.56",
    });
    expect(result.success).toBe(true);
  });

  it("exige conta bancária válida", () => {
    const result = balanceSnapshotSchema.safeParse({
      bank_account_id: "abc",
      snapshot_date: "2026-08-01",
      informed_balance: "100",
    });
    expect(result.success).toBe(false);
  });
});
