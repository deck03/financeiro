import { describe, expect, it } from "vitest";
import { parseOfx } from "@/lib/ofx/parse";

const SGML_SAMPLE = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260705120000
<TRNAMT>-150.00
<FITID>202607050001
<NAME>PAGAMENTO FORNECEDOR X
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260706120000
<TRNAMT>2500.00
<FITID>202607060002
<NAME>RECEBIMENTO WELLHUB
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260710</DTPOSTED>
            <TRNAMT>-89.90</TRNAMT>
            <FITID>abc123</FITID>
            <MEMO>Conta de internet</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

describe("parseOfx", () => {
  it("extrai transações no formato SGML (OFX 1.x, sem tags de fechamento)", () => {
    const result = parseOfx(SGML_SAMPLE);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({
      fitid: "202607050001",
      date: "2026-07-05",
      amount: -150,
    });
    expect(result.transactions[0].description).toContain("PAGAMENTO FORNECEDOR X");
    expect(result.transactions[1].amount).toBe(2500);
  });

  it("extrai transações no formato XML (OFX 2.x, com tags de fechamento)", () => {
    const result = parseOfx(XML_SAMPLE);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      fitid: "abc123",
      date: "2026-07-10",
      amount: -89.9,
    });
  });

  it("retorna erro quando o arquivo não tem transações reconhecíveis", () => {
    const result = parseOfx("conteúdo qualquer sem formato OFX");
    expect(result.transactions).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("ignora transações sem data ou valor, sem quebrar o restante", () => {
    const malformed = `
      <STMTTRN>
        <FITID>1</FITID>
        <NAME>Sem data nem valor</NAME>
      </STMTTRN>
      <STMTTRN>
        <DTPOSTED>20260701
        <TRNAMT>100.00
        <FITID>2
        <NAME>Válida
      </STMTTRN>
    `;
    const result = parseOfx(malformed);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].fitid).toBe("2");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("preenche descrição padrão quando NAME e MEMO estão ausentes", () => {
    const noDescription = `
      <STMTTRN>
        <DTPOSTED>20260701
        <TRNAMT>50.00
        <FITID>3
      </STMTTRN>
    `;
    const result = parseOfx(noDescription);
    expect(result.transactions[0].description).toBe("Transação sem descrição");
  });
});
