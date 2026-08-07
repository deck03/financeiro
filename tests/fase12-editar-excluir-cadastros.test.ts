import { describe, it, expect } from "vitest";
import { translateDeleteError } from "@/lib/cadastros/delete-error";

describe("Melhoria — editar e excluir cadastros (plano de contas, centros de custo, contas bancárias, contrapartes, formas de pagamento)", () => {
  it("traduz violação de chave estrangeira (item em uso) numa mensagem amigável", () => {
    const msg = translateDeleteError({ code: "23503", message: "..." }, "Água");
    expect(msg).toContain("Água");
    expect(msg).toContain("em uso");
    expect(msg.toLowerCase()).toContain("desative");
  });

  it("usa uma mensagem genérica para outros erros", () => {
    const msg = translateDeleteError({ code: "42501", message: "..." }, "Água");
    expect(msg).toBe("Não foi possível excluir.");
  });

  it("lida com erro nulo sem quebrar", () => {
    expect(translateDeleteError(null, "Água")).toBe("Não foi possível excluir.");
  });
});
