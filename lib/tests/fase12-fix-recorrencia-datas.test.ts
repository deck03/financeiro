import { describe, it, expect } from "vitest";
import { computeRecurringDueDates } from "@/lib/finance/recurring-dates";

describe("Correção — deriva cumulativa no ajuste de dia útil das recorrências", () => {
  it("mantém o dia do mês ancorado (24), ajustando cada ocorrência individualmente, sem arrastar o desvio para as seguintes", () => {
    const dates = computeRecurringDueDates("2026-08-24", "mensal", 1, 11, true);

    // Reproduz exatamente o caso relatado: início 24/08/2026, mensal, ajuste
    // de dia útil ativado. Outubro/2026 e janeiro/2027 caem em fim de
    // semana e são ajustados; todos os outros meses voltam para o dia 24 —
    // nunca ficam "grudados" no valor ajustado do mês anterior.
    expect(dates).toEqual([
      "2026-08-24", // segunda — sem ajuste
      "2026-09-24", // quinta — sem ajuste
      "2026-10-26", // 24 cai num sábado -> ajustado para segunda 26
      "2026-11-24", // volta para 24 (não fica em 26)
      "2026-12-24",
      "2027-01-25", // 24 cai num domingo -> ajustado para segunda 25
      "2027-02-24", // volta para 24 (não fica em 25)
      "2027-03-24",
      "2027-04-26", // 24 cai num sábado -> ajustado para segunda 26
      "2027-05-24", // volta para 24
      "2027-06-24",
    ]);
  });

  it("sem ajuste de dia útil, as datas caem sempre no mesmo dia do mês, incluindo finais de semana", () => {
    const dates = computeRecurringDueDates("2026-08-24", "mensal", 1, 5, false);
    expect(dates).toEqual(["2026-08-24", "2026-09-24", "2026-10-24", "2026-11-24", "2026-12-24"]);
  });

  it("funciona também para frequência semanal", () => {
    const dates = computeRecurringDueDates("2026-08-03", "semanal", 1, 4, false);
    expect(dates).toEqual(["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24"]);
  });

  it("respeita o intervalo (a cada N períodos)", () => {
    const dates = computeRecurringDueDates("2026-01-15", "mensal", 3, 4, false);
    expect(dates).toEqual(["2026-01-15", "2026-04-15", "2026-07-15", "2026-10-15"]);
  });
});
