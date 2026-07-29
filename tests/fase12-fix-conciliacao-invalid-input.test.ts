import { describe, it, expect } from "vitest";
import { reconcileNewEntrySchema } from "@/lib/validation/ofx";

const base = {
  bank_transaction_id: "11111111-1111-1111-1111-111111111111",
  category_id: "22222222-2222-2222-2222-222222222222",
};

describe("Correção — 'Invalid input' ao criar lançamento pela conciliação bancária", () => {
  // O formulário de "Criar lançamento" na tela de Conciliação nunca teve
  // campos de número de documento e observações. formData.get() retorna
  // null (não undefined) para um campo que não existe no formulário, e
  // z.optional() só aceita undefined — mesma causa-raiz já corrigida em
  // relatórios, parcelamento/recorrência e contas bancárias.
  it("REPRODUZ o bug: document_number/notes como null (campos ausentes do formulário) falha", () => {
    const result = reconcileNewEntrySchema.safeParse({
      ...base,
      document_number: null,
      notes: null,
    });
    expect(result.success).toBe(false);
  });

  it("CORRIGE: convertendo null para string vazia antes de validar, a mesma entrada passa", () => {
    const result = reconcileNewEntrySchema.safeParse({
      ...base,
      document_number: "",
      notes: "",
    });
    expect(result.success).toBe(true);
  });

  it("continua exigindo a categoria", () => {
    const result = reconcileNewEntrySchema.safeParse({
      bank_transaction_id: base.bank_transaction_id,
      document_number: "",
      notes: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("Melhoria — data de competência ao criar lançamento pela conciliação", () => {
  it("aceita a competência informada", () => {
    const result = reconcileNewEntrySchema.safeParse({
      ...base,
      competence_date: "2026-07-20",
    });
    expect(result.success).toBe(true);
  });

  it("aceita sem competência informada (o banco usa a data da transação como padrão)", () => {
    const result = reconcileNewEntrySchema.safeParse({
      ...base,
      competence_date: "",
    });
    expect(result.success).toBe(true);
  });
});
