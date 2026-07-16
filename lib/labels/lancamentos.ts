export const ENTRY_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  em_aberto: "Em aberto",
  agendado: "Agendado",
  parcialmente_pago: "Parcialmente pago",
  parcialmente_recebido: "Parcialmente recebido",
  pago: "Pago",
  recebido: "Recebido",
  vencido: "Vencido",
  cancelado: "Cancelado",
  estornado: "Estornado",
};

export const ENTRY_STATUS_COLORS: Record<string, "positive" | "negative" | "warning" | "neutral"> = {
  rascunho: "neutral",
  em_aberto: "warning",
  agendado: "warning",
  parcialmente_pago: "warning",
  parcialmente_recebido: "warning",
  pago: "positive",
  recebido: "positive",
  vencido: "negative",
  cancelado: "neutral",
  estornado: "neutral",
};
