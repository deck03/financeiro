import { describe, it, expect } from "vitest";
import { escapeCsvValue, toCsv, CSV_BOM } from "@/lib/export/csv";
import { formatDateBR, formatNumberBR, exportFileName } from "@/lib/export/format";
import { buildDreExportLines } from "@/lib/export/dre-lines";
import { buildDRE } from "@/lib/finance/dre";
import { mergeSociosLines } from "@/lib/finance/dre-socios";

describe("Fase 12 — CSV", () => {
  it("escapa valores com ponto e vírgula (separador do Excel pt-BR)", () => {
    expect(escapeCsvValue("Aluguel; sala 2")).toBe('"Aluguel; sala 2"');
  });

  it("escapa aspas duplicando-as", () => {
    expect(escapeCsvValue('Sala "Principal"')).toBe('"Sala ""Principal"""');
  });

  it("escapa quebras de linha", () => {
    expect(escapeCsvValue("linha 1\nlinha 2")).toBe('"linha 1\nlinha 2"');
  });

  it("mantém valores simples sem aspas", () => {
    expect(escapeCsvValue("Aluguel")).toBe("Aluguel");
    expect(escapeCsvValue(1234)).toBe("1234");
  });

  it("converte null/undefined em vazio", () => {
    expect(escapeCsvValue(null)).toBe("");
    expect(escapeCsvValue(undefined)).toBe("");
  });

  it("gera CSV com BOM, separador ; e CRLF", () => {
    const csv = toCsv(["A", "B"], [["1", "x;y"]]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toContain("A;B\r\n");
    expect(csv).toContain('1;"x;y"\r\n');
  });
});

describe("Fase 12 — formatação", () => {
  it("formata datas ISO no padrão brasileiro", () => {
    expect(formatDateBR("2026-07-21")).toBe("21/07/2026");
    expect(formatDateBR(null)).toBe("");
    expect(formatDateBR("data-invalida")).toBe("");
  });

  it("formata números no padrão brasileiro com duas casas", () => {
    // Intl usa espaço não separável em alguns ambientes; normalizamos
    const formatted = formatNumberBR(1234.5).replace(/\u00a0/g, " ");
    expect(formatted).toBe("1.234,50");
  });

  it("gera nomes de arquivo padronizados com a data", () => {
    const name = exportFileName("dre", "pdf", new Date("2026-07-21T12:00:00Z"));
    expect(name).toBe("deck03-dre-2026-07-21.pdf");
  });
});

describe("Fase 12 — linhas da DRE exportada", () => {
  const items = [
    { type: "receita", amount: 1000, dre_behavior: "incluir_operacional", managerial_nature: "operacional", family_name: "Receitas" },
    { type: "despesa", amount: 300, dre_behavior: "incluir_operacional", managerial_nature: "operacional", family_name: "Pessoal" },
    { type: "despesa", amount: 50, dre_behavior: "fora_resultado", managerial_nature: "financeira", family_name: "Financeiras" },
    { type: "despesa", amount: 200, dre_behavior: "fora_resultado", managerial_nature: "investimento", family_name: "Investimentos" },
    { type: "despesa", amount: 400, dre_behavior: "nao_incluir", managerial_nature: "nao_classificada", family_name: "Sócios" },
  ];

  it("espelha a estrutura e os sinais da tela", () => {
    const dre = buildDRE(items);
    const socios = mergeSociosLines(dre, [{ classification: "distribuicao_lucros", amount: 100 }]);
    const lines = buildDreExportLines(dre, socios);

    const receitas = lines.find((l) => l.label === "Receitas operacionais");
    expect(receitas?.value).toBe(1000);

    const pessoal = lines.find((l) => l.label === "Pessoal");
    expect(pessoal?.value).toBe(-300); // despesa aparece negativa, como na tela

    const resultadoOp = lines.find((l) => l.label === "Resultado operacional gerencial");
    expect(resultadoOp?.value).toBe(700);
    expect(resultadoOp?.bold).toBe(true);

    const investimentos = lines.find((l) => l.label === "Investimentos no período");
    expect(investimentos?.value).toBe(-200);

    // Sócios: -400 (lançamento) - 100 (distribuição de lucros) = -500
    const sociosTotal = lines.find((l) => l.label === "Movimentações de sócios (total)");
    expect(sociosTotal?.value).toBe(-500);
  });

  it("distribuição de lucros nunca afeta o resultado operacional", () => {
    const dre = buildDRE(items);
    const semTransfer = mergeSociosLines(dre, []);
    const comTransfer = mergeSociosLines(dre, [{ classification: "distribuicao_lucros", amount: 99999 }]);

    const linhasSem = buildDreExportLines(dre, semTransfer);
    const linhasCom = buildDreExportLines(dre, comTransfer);

    const resultadoSem = linhasSem.find((l) => l.label === "Resultado operacional gerencial")?.value;
    const resultadoCom = linhasCom.find((l) => l.label === "Resultado operacional gerencial")?.value;
    expect(resultadoSem).toBe(resultadoCom);
  });

  it("omite 'Outros resultados' quando zero, como a tela", () => {
    const dre = buildDRE(items);
    const socios = mergeSociosLines(dre, []);
    const lines = buildDreExportLines(dre, socios);
    expect(lines.find((l) => l.label === "Outros resultados")).toBeUndefined();
  });
});
