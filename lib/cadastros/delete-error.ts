/**
 * Traduz o erro de exclusão de um cadastro (categoria, centro de custo,
 * contraparte, conta bancária, forma de pagamento) numa mensagem amigável.
 *
 * O banco nunca deixa excluir um cadastro que está em uso — todas as
 * referências (lançamentos, liquidações, transferências, recorrências,
 * recibos etc.) usam chaves estrangeiras sem "on delete cascade", então o
 * Postgres recusa a exclusão sozinho (código de erro 23503, violação de
 * chave estrangeira). Isso já é a proteção real; aqui só convertemos o
 * erro técnico numa mensagem que o usuário entende.
 */
export function translateDeleteError(error: { code?: string; message: string } | null, itemLabel: string): string {
  if (!error) return "Não foi possível excluir.";
  if (error.code === "23503") {
    return `Não é possível excluir "${itemLabel}" — ele está em uso em um ou mais registros (lançamentos, recibos, transferências etc.). Desative em vez de excluir, para preservar o histórico.`;
  }
  return "Não foi possível excluir.";
}
