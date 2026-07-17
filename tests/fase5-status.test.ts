import { describe, expect, it } from "vitest";
import { getEffectiveStatus } from "@/lib/finance/status";

describe("getEffectiveStatus", () => {
  it("retorna 'vencido' para lançamento em aberto com vencimento no passado", () => {
    expect(getEffectiveStatus("em_aberto", "2026-01-01", "2026-07-17")).toBe("vencido");
  });

  it("não marca como vencido um lançamento já pago", () => {
    expect(getEffectiveStatus("pago", "2026-01-01", "2026-07-17")).toBe("pago");
  });

  it("não marca como vencido um lançamento cancelado", () => {
    expect(getEffectiveStatus("cancelado", "2026-01-01", "2026-07-17")).toBe("cancelado");
  });

  it("não marca como vencido quando o vencimento ainda não passou", () => {
    expect(getEffectiveStatus("em_aberto", "2026-12-01", "2026-07-17")).toBe("em_aberto");
  });

  it("marca parcialmente pago vencido como vencido", () => {
    expect(getEffectiveStatus("parcialmente_pago", "2026-01-01", "2026-07-17")).toBe("vencido");
  });
});
