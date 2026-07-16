export const FAMILY_TYPE_LABELS: Record<string, string> = {
  receita: "Receita",
  despesa: "Despesa",
  transferencia: "Transferência",
};

export const MANAGERIAL_NATURE_LABELS: Record<string, string> = {
  operacional: "Operacional",
  financeira: "Financeira",
  investimento: "Investimento",
  financiamento: "Financiamento",
  movimentacao_socios: "Movimentação de sócios",
  pessoa_fisica: "Pessoa física",
  transferencia_interna: "Transferência interna",
  nao_classificada: "Não classificada",
};

export const DRE_BEHAVIOR_LABELS: Record<string, string> = {
  incluir_operacional: "Incluir na DRE operacional",
  fora_resultado: "Incluir fora do resultado operacional",
  nao_incluir: "Não incluir na DRE",
};

export const CASHFLOW_BEHAVIOR_LABELS: Record<string, string> = {
  operacional: "Operacional",
  investimento: "Investimento",
  financiamento: "Financiamento",
  socios: "Movimentação de sócios",
  transferencia_interna: "Transferência interna",
};
