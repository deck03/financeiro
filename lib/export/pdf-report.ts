import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Gerador de PDF para relatórios tabulares (ex.: DRE gerencial exportada).
 *
 * Mesmo estilo visual do recibo de aluguel (Fase 10): A4, Helvetica,
 * cabeçalho com identificação do DECK 03. Paginação automática quando as
 * linhas não cabem em uma página.
 *
 * Testado em tests/fase12-pdf-export.test.ts (estrutura do arquivo gerado).
 */

export type PdfReportLine = {
  label: string;
  value: string;
  /** níveis de recuo (0 = linha principal, 1 = detalhe) */
  indent?: number;
  bold?: boolean;
  /** desenha uma linha separadora acima (para totais) */
  separator?: boolean;
};

export type PdfReportData = {
  organizationName: string;
  title: string;
  subtitle: string;
  lines: PdfReportLine[];
  footnote?: string;
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;

const INK = rgb(0.11, 0.12, 0.15);
const INK_SOFT = rgb(0.35, 0.38, 0.44);
const ACCENT = rgb(0.18, 0.43, 0.37);
const RULE = rgb(0.85, 0.87, 0.9);

export async function generateReportPdf(data: PdfReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage(A4);
  let y = page.getHeight() - MARGIN;
  const width = page.getWidth() - MARGIN * 2;

  function drawHeader(current: PDFPage) {
    let hy = current.getHeight() - MARGIN;
    current.drawText(data.organizationName, { x: MARGIN, y: hy, size: 10, font: bold, color: ACCENT });
    hy -= 22;
    current.drawText(data.title, { x: MARGIN, y: hy, size: 16, font: bold, color: INK });
    hy -= 16;
    current.drawText(data.subtitle, { x: MARGIN, y: hy, size: 10, font, color: INK_SOFT });
    hy -= 10;
    current.drawLine({
      start: { x: MARGIN, y: hy },
      end: { x: MARGIN + width, y: hy },
      thickness: 1,
      color: RULE,
    });
    return hy - 18;
  }

  y = drawHeader(page);

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN + 30) {
      page = doc.addPage(A4);
      y = drawHeader(page);
    }
  }

  for (const line of data.lines) {
    const lineFont: PDFFont = line.bold ? bold : font;
    const size = line.bold ? 11 : 10;
    ensureSpace(line.separator ? 26 : 18);

    if (line.separator) {
      page.drawLine({
        start: { x: MARGIN, y: y + 6 },
        end: { x: MARGIN + width, y: y + 6 },
        thickness: 0.8,
        color: RULE,
      });
      y -= 4;
    }

    const x = MARGIN + (line.indent ?? 0) * 16;
    page.drawText(line.label, { x, y, size, font: lineFont, color: line.bold ? INK : INK_SOFT });

    const valueWidth = lineFont.widthOfTextAtSize(line.value, size);
    page.drawText(line.value, { x: MARGIN + width - valueWidth, y, size, font: lineFont, color: INK });
    y -= 18;
  }

  if (data.footnote) {
    ensureSpace(30);
    y -= 8;
    page.drawText(data.footnote, { x: MARGIN, y, size: 8, font, color: INK_SOFT });
  }

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `Página ${i + 1} de ${pages.length} — gerado pelo DECK 03 Financeiro`;
    p.drawText(label, { x: MARGIN, y: MARGIN - 24, size: 8, font, color: INK_SOFT });
  });

  return doc.save();
}
