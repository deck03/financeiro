export const TRANSFER_CLASSIFICATION_LABELS: Record<string, string> = {
  transferencia_interna: "Transferência interna",
  distribuicao_lucros: "Distribuição de lucros",
  retirada_socio: "Retirada de sócio",
  adiantamento_socio: "Adiantamento a sócio",
  reembolso_socio: "Reembolso de sócio",
  despesa_pessoal: "Despesa pessoal",
  aporte_socio: "Aporte de sócio",
  devolucao_adiantamento: "Devolução de adiantamento",
};

/**
 * Sentido do efeito de caixa de cada classificação de transferência sobre a
 * empresa, usado para compor a seção de movimentações de sócios da DRE.
 * "-1" significa dinheiro saindo da empresa; "1" significa entrando.
 */
export const TRANSFER_CLASSIFICATION_SIGN: Record<string, 1 | -1> = {
  distribuicao_lucros: -1,
  retirada_socio: -1,
  adiantamento_socio: -1,
  despesa_pessoal: -1,
  reembolso_socio: -1,
  aporte_socio: 1,
  devolucao_adiantamento: 1,
};
