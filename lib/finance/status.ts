const OPEN_STATUSES = ["em_aberto", "agendado", "parcialmente_pago", "parcialmente_recebido"];

/**
 * Calcula o status "efetivo" de um lançamento para exibição — nunca altera o
 * status armazenado no banco. Um lançamento em aberto (ou parcialmente
 * liquidado) cuja data de vencimento já passou aparece como "vencido" em
 * qualquer tela que use esta função, garantindo que a regra seja sempre a
 * mesma (seção 39 do escopo).
 */
export function getEffectiveStatus(status: string, dueDate: string, today: string = new Date().toISOString().slice(0, 10)): string {
  if (OPEN_STATUSES.includes(status) && dueDate < today) {
    return "vencido";
  }
  return status;
}
