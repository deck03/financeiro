import { describe, it, expect } from "vitest";
import { cancelReceiptSchema } from "@/lib/validation/recibos";

describe("Ajuste — cancelamento de recibo (funcionalidade que estava incompleta)", () => {
  it("aceita o cancelamento com motivo", () => {
    const result = cancelReceiptSchema.safeParse({
      receipt_id: "11111111-1111-1111-1111-111111111111",
      reason: "Emitido com valor errado",
    });
    expect(result.success).toBe(true);
  });

  it("aceita o cancelamento sem motivo (opcional)", () => {
    const result = cancelReceiptSchema.safeParse({
      receipt_id: "11111111-1111-1111-1111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita um receipt_id que não é um uuid", () => {
    const result = cancelReceiptSchema.safeParse({
      receipt_id: "não-é-um-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("mesma causa-raiz de outros formulários: aceita string vazia (campo ausente convertido) para o motivo", () => {
    const result = cancelReceiptSchema.safeParse({
      receipt_id: "11111111-1111-1111-1111-111111111111",
      reason: "",
    });
    expect(result.success).toBe(true);
  });
});
