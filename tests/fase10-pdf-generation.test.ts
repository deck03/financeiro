import { describe, expect, it } from "vitest";
import { generateReceiptPdf } from "@/lib/receipts/generate-pdf";

describe("generateReceiptPdf", () => {
  it("gera um PDF válido com os dados do recibo", async () => {
    const bytes = await generateReceiptPdf({
      organizationName: "DECK 03",
      organizationDocument: "12.345.678/0001-99",
      organizationAddress: "Rua Exemplo, 123 — São Paulo/SP",
      receiptNumber: "REC-000001",
      counterpartyName: "Locatário de Teste",
      counterpartyDocument: "123.456.789-00",
      amount: 1500,
      amountInWords: "Mil e quinhentos reais",
      paymentDate: "2026-07-20",
      referencePeriod: "Julho/2026",
      spaceDescription: "Quadra 2",
      paymentMethodName: "PIX",
      notes: null,
      verificationCode: "ABCD1234",
    });

    // Todo PDF válido começa com a assinatura "%PDF-"
    const header = Buffer.from(bytes.slice(0, 5)).toString("utf-8");
    expect(header).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(500);
  });

  it("gera um PDF mesmo com campos opcionais ausentes", async () => {
    const bytes = await generateReceiptPdf({
      organizationName: "DECK 03",
      organizationDocument: null,
      organizationAddress: null,
      receiptNumber: "REC-000002",
      counterpartyName: "Outro Locatário",
      counterpartyDocument: null,
      amount: 100,
      amountInWords: "Cem reais",
      paymentDate: "2026-07-01",
      referencePeriod: null,
      spaceDescription: null,
      paymentMethodName: null,
      notes: null,
      verificationCode: "XYZ99999",
    });

    const header = Buffer.from(bytes.slice(0, 5)).toString("utf-8");
    expect(header).toBe("%PDF-");
  });
});
