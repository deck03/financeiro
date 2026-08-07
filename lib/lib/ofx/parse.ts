export type ParsedOfxTransaction = {
  fitid: string | null;
  date: string; // YYYY-MM-DD
  amount: number; // positivo = crédito/entrada, negativo = débito/saída
  description: string;
};

export type ParsedOfx = {
  transactions: ParsedOfxTransaction[];
  errors: string[];
};

function extractTag(block: string, tag: string): string | null {
  // Tenta primeiro o formato XML (com tag de fechamento)
  const xmlMatch = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (xmlMatch) return xmlMatch[1].trim();

  // Formato SGML (OFX 1.x) — sem tag de fechamento, valor até a próxima tag ou quebra de linha
  const sgmlMatch = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
  if (sgmlMatch) return sgmlMatch[1].trim();

  return null;
}

function parseOfxDate(raw: string): string | null {
  // Formato OFX: YYYYMMDD[HHMMSS][.sss][[+-]TZ]
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}-${month}-${day}`;
}

function parseOfxAmount(raw: string): number | null {
  const normalized = raw.replace(/,/g, ".").trim();
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Extrai as transações de um arquivo OFX. Roda inteiramente no navegador —
 * nenhum dado do extrato é enviado a um servidor externo além do próprio
 * Supabase do usuário, e mesmo aqui só enviamos os campos já extraídos
 * (não o arquivo bruto).
 */
export function parseOfx(content: string): ParsedOfx {
  const errors: string[] = [];
  const transactions: ParsedOfxTransaction[] = [];

  const blocks = content.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTTRN>)/gi) ?? [];

  if (blocks.length === 0) {
    errors.push("Nenhuma transação encontrada no arquivo. Confirme que é um arquivo OFX válido.");
    return { transactions, errors };
  }

  for (const block of blocks) {
    const dtposted = extractTag(block, "DTPOSTED");
    const trnamt = extractTag(block, "TRNAMT");
    const fitid = extractTag(block, "FITID");
    const name = extractTag(block, "NAME");
    const memo = extractTag(block, "MEMO");

    if (!dtposted || !trnamt) {
      errors.push("Uma transação foi ignorada por falta de data ou valor.");
      continue;
    }

    const date = parseOfxDate(dtposted);
    const amount = parseOfxAmount(trnamt);

    if (!date || amount === null) {
      errors.push("Uma transação foi ignorada por data ou valor em formato inválido.");
      continue;
    }

    const description = [name, memo].filter((v) => v && v.length > 0).join(" — ") || "Transação sem descrição";

    transactions.push({ fitid: fitid || null, date, amount, description });
  }

  return { transactions, errors };
}
