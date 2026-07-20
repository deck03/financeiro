import { describe, expect, it } from "vitest";
import { parseRecipients } from "@/lib/validation/relatorios";

describe("parseRecipients", () => {
  it("separa por quebra de linha", () => {
    expect(parseRecipients("a@x.com\nb@x.com")).toEqual(["a@x.com", "b@x.com"]);
  });

  it("separa por vírgula e ponto e vírgula", () => {
    expect(parseRecipients("a@x.com, b@x.com; c@x.com")).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
  });

  it("remove espaços em branco e entradas vazias", () => {
    expect(parseRecipients("  a@x.com \n\n b@x.com  ,, ")).toEqual(["a@x.com", "b@x.com"]);
  });

  it("retorna lista vazia para string vazia", () => {
    expect(parseRecipients("")).toEqual([]);
  });
});
