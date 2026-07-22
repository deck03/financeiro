import "server-only";
import ExcelJS from "exceljs";

/**
 * Geração de arquivos Excel (.xlsx) para exportações e backup.
 *
 * Uso restrito ao servidor (Route Handlers) — a biblioteca exceljs nunca
 * entra no bundle do navegador.
 */

export type SheetSpec = {
  name: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
  /** Índices (0-based) de colunas numéricas, formatadas como moeda pt-BR. */
  currencyColumns?: number[];
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F2A37" },
};

export async function buildWorkbook(sheets: SheetSpec[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DECK 03 Financeiro";
  workbook.created = new Date();

  for (const sheet of sheets) {
    // O Excel limita nomes de aba a 31 caracteres e proíbe alguns símbolos.
    const safeName = sheet.name.replace(/[\\/?*[\]:]/g, "-").slice(0, 31) || "Dados";
    const ws = workbook.addWorksheet(safeName);

    const headerRow = ws.addRow(sheet.headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
    });

    for (const row of sheet.rows) {
      ws.addRow(row.map((v) => (v === null ? "" : v)));
    }

    for (const colIndex of sheet.currencyColumns ?? []) {
      const col = ws.getColumn(colIndex + 1);
      col.numFmt = '"R$" #,##0.00';
    }

    // Largura automática aproximada (exceljs não calcula sozinho).
    ws.columns.forEach((col, i) => {
      let max = sheet.headers[i]?.length ?? 10;
      for (const row of sheet.rows) {
        const len = String(row[i] ?? "").length;
        if (len > max) max = len;
      }
      col.width = Math.min(Math.max(max + 2, 10), 60);
    });

    ws.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
