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
  dueDate: string | null; // YYYY-MM-DD — vencimento da conta a receber
  referencePeriod: string | null; // ex.: "Julho/2026"
  spaceDescription: string | null;
  paymentMethodName: string | null;
  notes: string | null;
  verificationCode: string;
  bankDetails: {
    bankName: string | null;
    bankCode: string | null;
    agency: string | null;
    accountNumber: string | null;
    pixKey: string | null;
    beneficiaryName: string | null;
  } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateBR(iso: string | null) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Gera o PDF do recibo de aluguel no layout do modelo real usado pelo DECK 03
 * (locador e imóvel fixos, campos rotulados: Locatário, Referência,
 * Vencimento, Total, e o bloco de dados bancários da conta que recebeu o
 * pagamento). Página única, A4. Documento gerencial — não substitui nota
 * fiscal.
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
  const rule = rgb(0.88, 0.9, 0.92);

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

  /** Desenha "Rótulo: valor", com o rótulo em negrito, quebrando linha se preciso. */
  function labeledLine(label: string, value: string, opts: { size?: number; gapAfter?: number } = {}) {
    const size = opts.size ?? 11;
    const labelText = `${label}: `;
    const labelWidth = boldFont.widthOfTextAtSize(labelText, size);
    const availableForValue = width - labelWidth;
    const valueLines = wrapText(value, availableForValue, size);

    page.drawText(labelText, { x: margin, y, size, font: boldFont, color: ink });
    page.drawText(valueLines[0] ?? "", { x: margin + labelWidth, y, size, font, color: ink });
    y -= size + 6;

    for (const extra of valueLines.slice(1)) {
      page.drawText(extra, { x: margin + labelWidth, y, size, font, color: ink });
      y -= size + 6;
    }
    y -= opts.gapAfter ?? 4;
  }

  function heading(value: string, size = 12) {
    page.drawText(value, { x: margin, y, size, font: boldFont, color: accent });
    y -= size + 8;
  }

  function rulerLine(gap = 16) {
    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + width, y }, thickness: 1, color: rule });
    y -= gap;
  }

  // ------------------------------------------------------------------
  // Cabeçalho
  // ------------------------------------------------------------------
  page.drawText("RECIBO DE ALUGUEL E TAXA CONDOMINIAL", { x: margin, y, size: 16, font: boldFont, color: accent });
  const receiptLabel = `Nº ${data.receiptNumber}`;
  page.drawText(receiptLabel, {
    x: margin + width - boldFont.widthOfTextAtSize(receiptLabel, 11),
    y: y + 2,
    size: 11,
    font: boldFont,
    color: inkSoft,
  });
  y -= 30;

  const locadorLine = `${data.organizationName}${data.organizationDocument ? ` – CNPJ: ${data.organizationDocument}` : ""}`;
  labeledLine("Locador", locadorLine);
  if (data.organizationAddress) {
    labeledLine("Imóvel", data.organizationAddress);
  }

  rulerLine();

  // ------------------------------------------------------------------
  // Dados do locatário e do recebimento — preenchidos automaticamente a
  // partir do lançamento (razão social/CNPJ da contraparte, competência,
  // vencimento e valor). Nada disso é digitado à mão pelo operador.
  // ------------------------------------------------------------------
  const locatarioLine = `${data.counterpartyName}${data.counterpartyDocument ? ` – CNPJ: ${data.counterpartyDocument}` : ""}`;
  labeledLine("Locatário", locatarioLine, { size: 12 });
  if (data.spaceDescription) {
    labeledLine("Espaço", data.spaceDescription, { size: 12 });
  }
  labeledLine("Referência", data.referencePeriod ?? "—", { size: 12 });
  labeledLine("Vencimento", formatDateBR(data.dueDate) || "—", { size: 12 });
  labeledLine("Total", formatCurrency(data.amount), { size: 12, gapAfter: 2 });

  y -= 4;
  for (const line of wrapText(`Valor por extenso: ${data.amountInWords}.`, width, 10, font)) {
    page.drawText(line, { x: margin, y, size: 10, font, color: inkSoft });
    y -= 14;
  }

  rulerLine();

  // ------------------------------------------------------------------
  // Dados bancários — da conta que recebeu o pagamento.
  // ------------------------------------------------------------------
  if (data.bankDetails) {
    heading("Dados Bancários");
    const b = data.bankDetails;
    if (b.bankName) labeledLine(`Banco ${b.bankName}`, b.bankCode ?? "—");
    if (b.agency) labeledLine("Agência", b.agency);
    if (b.accountNumber) labeledLine("Conta Corrente", b.accountNumber);
    if (b.pixKey) labeledLine("Chave Pix", b.pixKey);
    if (b.beneficiaryName) labeledLine("Beneficiário", b.beneficiaryName);
    rulerLine();
  }

  // ------------------------------------------------------------------
  // Complementares (forma de pagamento, observações) — não fazem parte do
  // modelo fixo, mas ajudam a rastrear o recebimento quando preenchidos.
  // ------------------------------------------------------------------
  if (data.paymentMethodName) labeledLine("Forma de pagamento", data.paymentMethodName, { size: 10 });
  if (data.notes) labeledLine("Observações", data.notes, { size: 10 });

  // Valor total repetido ao final, como no modelo original (campo de
  // fechamento do documento).
  y -= 10;
  const totalLabel = `Valor Total: ${formatCurrency(data.amount)}`;
  page.drawText(totalLabel, { x: margin, y, size: 13, font: boldFont, color: ink });
  y -= 40;

  page.drawLine({ start: { x: margin, y }, end: { x: margin + 220, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
  y -= 14;
  page.drawText("Assinatura do responsável", { x: margin, y, size: 9, font, color: inkSoft });

  y -= 40;
  page.drawText(`Emitido em ${formatDateBR(new Date().toISOString().slice(0, 10))}`, { x: margin, y, size: 9, font, color: inkSoft });
  y -= 14;
  page.drawText(`Código de verificação: ${data.verificationCode}`, { x: margin, y, size: 9, font, color: inkSoft });

  y -= 26;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + width, y }, thickness: 0.5, color: rule });
  y -= 16;
  for (const line of wrapText(
    "Este documento é um recibo gerencial interno e não possui valor fiscal. Não substitui nota fiscal.",
    width,
    8
  )) {
    page.drawText(line, { x: margin, y, size: 8, font, color: inkSoft });
    y -= 11;
  }

  return doc.save();
}
