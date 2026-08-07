import { describe, expect, it } from "vitest";
import { amountInWords } from "@/lib/receipts/amount-in-words";

describe("amountInWords", () => {
  it("converte um valor simples", () => {
    expect(amountInWords(1)).toBe("Um real");
    expect(amountInWords(2)).toBe("Dois reais");
  });

  it("converte cem exatamente", () => {
    expect(amountInWords(100)).toBe("Cem reais");
  });

  it("converte valores com centenas", () => {
    expect(amountInWords(150)).toBe("Cento e cinquenta reais");
    expect(amountInWords(500)).toBe("Quinhentos reais");
  });

  it("converte mil exatamente", () => {
    expect(amountInWords(1000)).toBe("Mil reais");
  });

  it("converte mil e quinhentos", () => {
    expect(amountInWords(1500)).toBe("Mil e quinhentos reais");
  });

  it("converte valores com centavos", () => {
    expect(amountInWords(1234.56)).toBe(
      "Mil duzentos e trinta e quatro reais e cinquenta e seis centavos"
    );
  });

  it("converte apenas centavos", () => {
    expect(amountInWords(0.5)).toBe("Zero reais e cinquenta centavos");
    expect(amountInWords(0.01)).toBe("Zero reais e um centavo");
  });

  it("converte dezenas de milhares", () => {
    expect(amountInWords(50000)).toBe("Cinquenta mil reais");
  });

  it("converte valores com milhares e centenas juntos", () => {
    expect(amountInWords(2500.75)).toBe(
      "Dois mil e quinhentos reais e setenta e cinco centavos"
    );
  });

  it("usa singular para um centavo e um real juntos", () => {
    expect(amountInWords(1.01)).toBe("Um real e um centavo");
  });

  it("arredonda corretamente valores com mais de duas casas decimais", () => {
    expect(amountInWords(10.005)).toBe("Dez reais e um centavo");
  });
});
