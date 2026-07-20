const UNITS = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const TEENS = ["dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const HUNDREDS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function threeDigitsToWords(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";

  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];

  if (hundred > 0) parts.push(HUNDREDS[hundred]);

  if (rest > 0) {
    if (parts.length > 0) parts.push("e");
    if (rest < 10) {
      parts.push(UNITS[rest]);
    } else if (rest < 20) {
      parts.push(TEENS[rest - 10]);
    } else {
      const ten = Math.floor(rest / 10);
      const unit = rest % 10;
      parts.push(unit === 0 ? TENS[ten] : `${TENS[ten]} e ${UNITS[unit]}`);
    }
  }

  return parts.join(" ");
}

/**
 * Converte um número inteiro em extenso, em português. Suporta até
 * bilhões — mais que suficiente para qualquer valor de aluguel real.
 *
 * Simplificação documentada: não aplica a regra gramatical de "de reais"
 * para milhões/bilhões exatos (ex.: "dois milhões de reais"). Como recibos
 * de aluguel raramente atingem esses valores, o impacto prático é nulo,
 * mas é uma imprecisão gramatical conhecida.
 */
function integerToWords(n: number): string {
  if (n === 0) return "zero";

  const groups: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    groups.unshift(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const parts: { text: string; value: number; scaleIndex: number }[] = [];

  groups.forEach((group, index) => {
    if (group === 0) return;
    const scaleIndex = groups.length - 1 - index; // 0=unidades, 1=mil, 2=milhão, 3=bilhão

    let text = threeDigitsToWords(group);
    if (scaleIndex === 1) {
      text = group === 1 ? "mil" : `${text} mil`;
    } else if (scaleIndex === 2) {
      text += group === 1 ? " milhão" : " milhões";
    } else if (scaleIndex === 3) {
      text += group === 1 ? " bilhão" : " bilhões";
    }

    parts.push({ text, value: group, scaleIndex });
  });

  if (parts.length === 1) return parts[0].text;

  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1);
  const useE = last.value < 100 || last.value % 100 === 0;

  // Caso especial: "mil" seguido diretamente de uma centena (sem "e" nem
  // vírgula) — é assim que se escreve naturalmente em português, ex.:
  // "mil duzentos e trinta e quatro", não "mil, duzentos...".
  if (rest.length === 1 && rest[0].scaleIndex === 1 && !useE) {
    return `${rest[0].text} ${last.text}`;
  }

  const joined = rest.map((p) => p.text).join(", ");
  return useE ? `${joined} e ${last.text}` : `${joined}, ${last.text}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Converte um valor em reais para extenso, ex.: 1234.56 ->
 * "Mil duzentos e trinta e quatro reais e cinquenta e seis centavos".
 */
export function amountInWords(value: number): string {
  const rounded = Math.round(Math.abs(value) * 100) / 100;
  const reais = Math.floor(rounded);
  const centavos = Math.round((rounded - reais) * 100);

  const reaisWords =
    reais === 0 ? "zero reais" : `${integerToWords(reais)} ${reais === 1 ? "real" : "reais"}`;

  if (centavos === 0) return capitalize(reaisWords);

  const centavosWords = `${integerToWords(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  return capitalize(`${reaisWords} e ${centavosWords}`);
}
