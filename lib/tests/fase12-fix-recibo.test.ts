import { describe, it, expect } from "vitest";
import { formatReferencePeriod } from "@/lib/receipts/reference-period";

describe("Ajuste — recibo no modelo real: referência automática pela competência", () => {
  it("formata a competência como 'Mês/Ano' em português", () => {
    expect(formatReferencePeriod("2026-07-15")).toBe("Julho/2026");
    expect(formatReferencePeriod("2026-01-01")).toBe("Janeiro/2026");
    expect(formatReferencePeriod("2026-12-31")).toBe("Dezembro/2026");
  });

  it("retorna null quando não há data de competência", () => {
    expect(formatReferencePeriod(null)).toBeNull();
    expect(formatReferencePeriod(undefined)).toBeNull();
  });

  it("retorna null para uma string em formato inesperado, em vez de quebrar", () => {
    expect(formatReferencePeriod("não é uma data")).toBeNull();
  });
});
