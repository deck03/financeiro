import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { generateReportPdf } from "@/lib/export/pdf-report";
import { buildWorkbook } from "@/lib/export/xlsx";

describe("Fase 12 — PDF de relatório", () => {
  it("gera um PDF válido de página única", async () => {
    const bytes = await generateReportPdf({
      organizationName: "DECK 03",
      title: "DRE gerencial",
      subtitle: "01/07/2026 a 21/07/2026 · Regime de caixa",
      lines: [
        { label: "Receitas operacionais", value: "R$ 1.000,00" },
        { label: "Pessoal", value: "-R$ 300,00", indent: 1 },
        { label: "Resultado operacional gerencial", value: "R$ 700,00", bold: true, separator: true },
      ],
      footnote: "Documento gerencial, sem valor fiscal.",
    });

    expect(bytes.length).toBeGreaterThan(1000);
    const header = String.fromCharCode(...bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("pagina automaticamente com muitas linhas", async () => {
    const lines = Array.from({ length: 120 }, (_, i) => ({
      label: `Linha ${i + 1}`,
      value: `R$ ${i},00`,
    }));
    const bytes = await generateReportPdf({
      organizationName: "DECK 03",
      title: "Relatório longo",
      subtitle: "Teste de paginação",
      lines,
    });
    // Um PDF de várias páginas é substancialmente maior e continua válido
    expect(bytes.length).toBeGreaterThan(4000);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });
});

describe("Fase 12 — planilha Excel", () => {
  it("gera um .xlsx legível com os dados corretos (roundtrip)", async () => {
    const bytes = await buildWorkbook([
      {
        name: "Contas a pagar",
        headers: ["Descrição", "Valor (R$)"],
        rows: [
          ["Aluguel", 2500],
          ["Energia", 430.5],
        ],
        currencyColumns: [1],
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as any);
    const ws = workbook.getWorksheet("Contas a pagar");
    expect(ws).toBeDefined();
    expect(ws!.getCell("A1").value).toBe("Descrição");
    expect(ws!.getCell("A2").value).toBe("Aluguel");
    expect(Number(ws!.getCell("B2").value)).toBe(2500);
    expect(Number(ws!.getCell("B3").value)).toBe(430.5);
  });

  it("higieniza nomes de aba inválidos para o Excel", async () => {
    const bytes = await buildWorkbook([
      { name: "Extrato: C6/Conta [1]", headers: ["A"], rows: [["x"]] },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as any);
    expect(workbook.worksheets[0].name).toBe("Extrato- C6-Conta -1-");
  });
});
