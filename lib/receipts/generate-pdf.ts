import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ReceiptPdfData = {
  organizationName: string;
  organizationDocument: string | null;
  organizationAddress: string | null;
  receiptNumber: string;
  counterpartyName: string;
  counterpartyDocument: string | null;
  amount: number;
  amountInWords: string;
  paymentDate: string; // YYYY-MM-DD
  referencePeriod: string | null;
  spaceDescription: string | null;
  paymentMethodName: string | null;
  notes: string | null;
  verificationCode: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateBR(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Gera o PDF do recibo de aluguel. Layout fixo de página única — este é um
 * documento gerencial, não uma nota fiscal (o texto final do recibo deixa
 * isso explícito).
 */
export async function generateReceiptPdf(data: ReceiptPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 56;
  const width = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  const ink = rgb(0.11, 0.12, 0.15);
  const inkSoft = rgb(0.35, 0.38, 0.44);
  const accent = rgb(0.18, 0.43, 0.37);

  function text(value: string, opts: { size?: number; font?: typeof font; color?: ReturnType<typeof rgb>; x?: number } = {}) {
    const size = opts.size ?? 11;
    page.drawText(value, {
      x: opts.x ?? margin,
      y,
      size,
      font: opts.font ?? font,
      color: opts.color ?? ink,
    });
  }

  function wrapText(value: string, maxWidth: number, size: number, useFont = font): string[] {
    const words = value.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const attempt = current ? `${current} ${word}` : word;
      if (useFont.widthOfTextAtSize(attempt, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = attempt;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // Cabeçalho
  text(data.organizationName, { size: 16, font: boldFont });
  y -= 18;
  if (data.organizationDocument) {
    text(data.organizationDocument, { size: 10, color: inkSoft });
    y -= 14;
  }
  if (data.organizationAddress) {
    for (const line of wrapText(data.organizationAddress, width, 10)) {
      text(line, { size: 10, color: inkSoft });
      y -= 14;
    }
  }

  y -= 20;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + width, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 32;

  text("RECIBO DE ALUGUEL", { size: 18, font: boldFont, color: accent });
  page.drawText(`Nº ${data.receiptNumber}`, {
    x: margin + width - font.widthOfTextAtSize(`Nº ${data.receiptNumber}`, 12),
    y: y + 5,
    size: 12,
    font: boldFont,
    color: inkSoft,
  });
  y -= 34;

  const amountText = `Recebi de ${data.counterpartyName}${data.counterpartyDocument ? ` (${data.counterpartyDocument})` : ""} a quantia de ${formatCurrency(data.amount)} (${data.amountInWords}), referente ao aluguel do espaço${data.spaceDescription ? ` "${data.spaceDescription}"` : ""}${data.referencePeriod ? `, período de referência ${data.referencePeriod}` : ""}.`;

  for (const line of wrapText(amountText, width, 12)) {
    text(line, { size: 12 });
    y -= 18;
  }

  y -= 12;

  const fields: [string, string | null][] = [
    ["Data do recebimento", formatDateBR(data.paymentDate)],
    ["Forma de pagamento", data.paymentMethodName],
    ["Observações", data.notes],
  ];

  for (const [label, value] of fields) {
    if (!value) continue;
    text(`${label}:`, { size: 10, font: boldFont, color: inkSoft });
    const labelWidth = boldFont.widthOfTextAtSize(`${label}: `, 10);
    page.drawText(value, { x: margin + labelWidth, y, size: 10, font, color: ink });
    y -= 16;
  }

  y -= 40;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 220, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
  y -= 14;
  text("Assinatura do responsável", { size: 9, color: inkSoft });

  y -= 50;
  text(`Emitido em ${formatDateBR(new Date().toISOString().slice(0, 10))}`, { size: 9, color: inkSoft });
  y -= 14;
  text(`Código de verificação: ${data.verificationCode}`, { size: 9, color: inkSoft });

  y -= 30;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + width, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
  y -= 16;
  for (const line of wrapText(
    "Este documento é um recibo gerencial interno e não possui valor fiscal. Não substitui nota fiscal.",
    width,
    8
  )) {
    text(line, { size: 8, color: inkSoft });
    y -= 11;
  }

  return doc.save();
}
