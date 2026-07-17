import { describe, expect, it } from "vitest";
import { projectCashflow } from "@/lib/finance/projection";
import { computeRemainingBalance } from "@/lib/finance/remaining";

describe("projectCashflow", () => {
  it("sem movimentações, o saldo final é igual ao saldo atual", () => {
    const result = projectCashflow(1000, [], "2026-08-01", "2026-08-10");
    expect(result.finalBalance).toBe(1000);
    expect(result.minBalance).toBe(1000);
    expect(result.negativeDaysCount).toBe(0);
  });

  it("aplica uma entrada futura corretamente", () => {
    const result = projectCashflow(
      1000,
      [{ date: "2026-08-05", amount: 500 }],
      "2026-08-01",
      "2026-08-10"
    );
    expect(result.finalBalance).toBe(1500);
    expect(result.checkpoints).toHaveLength(1);
    expect(result.checkpoints[0].balance).toBe(1500);
  });

  it("detecta o menor saldo e a data em que ele ocorre", () => {
    const result = projectCashflow(
      1000,
      [
        { date: "2026-08-03", amount: -1500 }, // saldo vai a -500
        { date: "2026-08-07", amount: 2000 }, // saldo volta a 1500
      ],
      "2026-08-01",
      "2026-08-10"
    );
    expect(result.minBalance).toBe(-500);
    expect(result.minBalanceDate).toBe("2026-08-03");
    expect(result.finalBalance).toBe(1500);
  });

  it("conta corretamente os dias com saldo negativo", () => {
    // saldo fica negativo de 03/08 até 06/08 (4 dias), volta ao positivo em 07/08
    const result = projectCashflow(
      1000,
      [
        { date: "2026-08-03", amount: -1500 },
        { date: "2026-08-07", amount: 2000 },
      ],
      "2026-08-01",
      "2026-08-10"
    );
    expect(result.negativeDaysCount).toBe(4);
  });

  it("soma múltiplas movimentações no mesmo dia", () => {
    const result = projectCashflow(
      0,
      [
        { date: "2026-08-05", amount: 300 },
        { date: "2026-08-05", amount: -100 },
      ],
      "2026-08-01",
      "2026-08-10"
    );
    expect(result.checkpoints).toHaveLength(1);
    expect(result.checkpoints[0].delta).toBe(200);
    expect(result.finalBalance).toBe(200);
  });

  it("ignora movimentações fora do horizonte", () => {
    const result = projectCashflow(
      100,
      [{ date: "2026-09-01", amount: -1000 }],
      "2026-08-01",
      "2026-08-10"
    );
    expect(result.finalBalance).toBe(100);
  });

  it("permanece negativo até o fim do horizonte se não houver recuperação", () => {
    const result = projectCashflow(
      100,
      [{ date: "2026-08-05", amount: -500 }],
      "2026-08-01",
      "2026-08-10"
    );
    // negativo de 05/08 a 10/08 = 6 dias
    expect(result.negativeDaysCount).toBe(6);
    expect(result.finalBalance).toBe(-400);
  });
});

describe("computeRemainingBalance", () => {
  const entryId = "entry-1";

  it("retorna o valor original quando não há liquidações", () => {
    expect(computeRemainingBalance(1000, entryId, [])).toBe(1000);
  });

  it("desconta uma liquidação parcial válida", () => {
    const settlements = [
      { entry_id: entryId, amount: 400, interest: 0, penalty: 0, discount: 0, addition: 0, status: "valido" },
    ];
    expect(computeRemainingBalance(1000, entryId, settlements)).toBe(600);
  });

  it("ignora liquidações estornadas", () => {
    const settlements = [
      { entry_id: entryId, amount: 1000, interest: 0, penalty: 0, discount: 0, addition: 0, status: "estornado" },
    ];
    expect(computeRemainingBalance(1000, entryId, settlements)).toBe(1000);
  });

  it("não conta juros/multa/acréscimo como abatimento do principal", () => {
    // amount=150 mas só 100 é principal (50 de juros) -> resta 900
    const settlements = [
      { entry_id: entryId, amount: 150, interest: 50, penalty: 0, discount: 0, addition: 0, status: "valido" },
    ];
    expect(computeRemainingBalance(1000, entryId, settlements)).toBe(900);
  });

  it("desconto reduz o saldo restante sem exigir caixa", () => {
    const settlements = [
      { entry_id: entryId, amount: 900, interest: 0, penalty: 0, discount: 100, addition: 0, status: "valido" },
    ];
    expect(computeRemainingBalance(1000, entryId, settlements)).toBe(0);
  });
});
