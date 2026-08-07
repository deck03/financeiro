import { describe, expect, it } from "vitest";
import { loginSchema, recoverySchema, updatePasswordSchema } from "@/lib/validation/auth";
import { organizationSettingsSchema } from "@/lib/validation/organization";

describe("loginSchema", () => {
  it("aceita e-mail e senha válidos", () => {
    const result = loginSchema.safeParse({ email: "admin@deck03.com", password: "123456" });
    expect(result.success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    const result = loginSchema.safeParse({ email: "não-e-mail", password: "123456" });
    expect(result.success).toBe(false);
  });

  it("rejeita senha vazia", () => {
    const result = loginSchema.safeParse({ email: "admin@deck03.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("recoverySchema", () => {
  it("exige e-mail válido", () => {
    expect(recoverySchema.safeParse({ email: "" }).success).toBe(false);
    expect(recoverySchema.safeParse({ email: "user@deck03.com" }).success).toBe(true);
  });
});

describe("updatePasswordSchema", () => {
  it("exige confirmação igual à senha", () => {
    const result = updatePasswordSchema.safeParse({
      password: "senha12345",
      confirmPassword: "senhaDiferente",
    });
    expect(result.success).toBe(false);
  });

  it("exige pelo menos 8 caracteres", () => {
    const result = updatePasswordSchema.safeParse({
      password: "1234567",
      confirmPassword: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("aceita senha válida e confirmada", () => {
    const result = updatePasswordSchema.safeParse({
      password: "senha12345",
      confirmPassword: "senha12345",
    });
    expect(result.success).toBe(true);
  });
});

describe("organizationSettingsSchema", () => {
  it("exige nome de exibição", () => {
    expect(organizationSettingsSchema.safeParse({ display_name: "" }).success).toBe(false);
  });

  it("aceita apenas o nome de exibição preenchido", () => {
    const result = organizationSettingsSchema.safeParse({ display_name: "DECK 03" });
    expect(result.success).toBe(true);
  });
});
