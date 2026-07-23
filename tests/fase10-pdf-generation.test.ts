import { describe, expect, it } from "vitest";
import { generateReceiptPdf } from "@/lib/receipts/generate-pdf";

describe("generateReceiptPdf", () => {
  it("gera um PDF válido com os dados do recibo, no layout do modelo real (com dados bancários)", async () => {
    const bytes = await generateReceiptPdf({
      organizationName: "DECK SPORT CLUB COMÉRCIO E EVENTOS ESPORTIVOS LTDA",
      organizationDocument: "45.550.125/0001-23",
      organizationAddress: "Rua Pedroso, 258 — São Paulo/SP — 01322-010",
      receiptNumber: "REC-000001",
      counterpartyName: "Locatário de Teste LTDA",
      counterpartyDocument: "12.345.678/0001-99",
      amount: 1500,
      amountInWords: "Mil e quinhentos reais",
      dueDate: "2026-08-05",
      referencePeriod: "Julho/2026",
      spaceDescription: "Quadra 2",
      paymentMethodName: "PIX",
      notes: null,
      verificationCode: "ABCD1234",
      bankDetails: {
        bankName: "Itaú",
        bankCode: "341",
        agency: "6741",
        accountNumber: "99644-8",
        pixKey: "45.550.125/0001-23",
        beneficiaryName: "Deck Sport Club",
      },
    });

    // Todo PDF válido começa com a assinatura "%PDF-"
    const header = Buffer.from(bytes.slice(0, 5)).toString("utf-8");
    expect(header).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(500);
  });

  it("gera um PDF mesmo com campos opcionais ausentes (sem dados bancários, sem vencimento)", async () => {
    const bytes = await generateReceiptPdf({
      organizationName: "DECK 03",
      organizationDocument: null,
      organizationAddress: null,
      receiptNumber: "REC-000002",
      counterpartyName: "Outro Locatário",
      counterpartyDocument: null,
      amount: 100,
      amountInWords: "Cem reais",
      dueDate: null,
      referencePeriod: null,
      spaceDescription: null,
      paymentMethodName: null,
      notes: null,
      verificationCode: "XYZ99999",
      bankDetails: null,
    });

    const header = Buffer.from(bytes.slice(0, 5)).toString("utf-8");
    expect(header).toBe("%PDF-");
  });
});
