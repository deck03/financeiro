/**
 * Normaliza a descrição de uma transação bancária para permitir comparar
 * duas transações "parecidas" ao longo do tempo (ex.: "SABESP 0001234" em
 * julho e "SABESP 0009876" em agosto devem ser reconhecidas como a mesma
 * origem, mesmo com números de referência diferentes).
 *
 * Remove acentos, dígitos (datas, números de referência, valores) e
 * pontuação, e normaliza espaços — mantém só as palavras que de fato
 * identificam a origem da transação.
 *
 * Função pura — testada em tests/fase12-conciliacao-sugestao.test.ts.
 */
export function normalizeTransactionDescription(description: string): string {
  return description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toUpperCase()
    .replace(/\d+/g, " ") // remove números (datas, referências, valores)
    .replace(/[^A-Z\s]/g, " ") // remove pontuação e símbolos
    .replace(/\s+/g, " ")
    .trim();
}
