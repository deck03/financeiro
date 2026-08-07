import { describe, it, expect } from "vitest";
import { sanitizeAuditValue } from "@/lib/audit/sanitize";

describe("Fase 12 — higienização de auditoria", () => {
  it("remove valores de chaves sensíveis em qualquer nível", () => {
    const result = sanitizeAuditValue({
      nome: "Conta X",
      senha: "supersecreta",
      config: { smtp_password: "abc123", api_key: "sk-xxx", host: "smtp.gmail.com" },
    }) as any;

    expect(result.nome).toBe("Conta X");
    expect(result.senha).toBe("[removido]");
    expect(result.config.smtp_password).toBe("[removido]");
    expect(result.config.api_key).toBe("[removido]");
    expect(result.config.host).toBe("smtp.gmail.com");
  });

  it("trunca strings muito longas", () => {
    const longa = "x".repeat(2000);
    const result = sanitizeAuditValue({ notas: longa }) as any;
    expect(result.notas.length).toBeLessThan(600);
    expect(result.notas.endsWith("…[truncado]")).toBe(true);
  });

  it("resume objetos muito profundos (evita payloads gigantes/ciclos)", () => {
    const profundo = { a: { b: { c: { d: { e: { f: 1 } } } } } };
    const result = sanitizeAuditValue(profundo) as any;
    expect(result.a.b.c.d).toBe("[objeto resumido]");
  });

  it("preserva números, booleanos e null", () => {
    expect(sanitizeAuditValue(42)).toBe(42);
    expect(sanitizeAuditValue(true)).toBe(true);
    expect(sanitizeAuditValue(null)).toBeNull();
    expect(sanitizeAuditValue(undefined)).toBeNull();
  });

  it("limita arrays a 50 itens", () => {
    const grande = Array.from({ length: 200 }, (_, i) => i);
    const result = sanitizeAuditValue(grande) as any;
    expect(result.length).toBe(50);
  });
});
