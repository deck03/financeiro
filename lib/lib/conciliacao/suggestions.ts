import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTransactionDescription } from "@/lib/finance/description-normalize";

/**
 * Sugestão de preenchimento automático para "Criar lançamento" na
 * conciliação — baseada na última vez que uma transação com descrição
 * parecida foi classificada (mesma origem, ex.: "SABESP", mesmo que a
 * referência/data mudem entre uma transação e outra).
 *
 * Só sugere; nunca decide sozinho — o operador sempre vê os campos já
 * preenchidos, mas pode mudar qualquer um antes de confirmar.
 */
export type ReconciliationSuggestion = {
  categoryId: string | null;
  subcategoryId: string | null;
  costCenterId: string | null;
  counterpartyId: string | null;
  paymentMethodId: string | null;
  sourceDescription: string; // descrição original da transação que originou a sugestão (para transparência)
};

const HISTORY_LIMIT = 500;

/**
 * Monta um índice `"<tipo>|<descrição normalizada>" -> sugestão`, usando os
 * lançamentos mais recentes criados a partir de conciliações anteriores
 * (reconcile_with_new_entry). Em caso de mais de um lançamento com a mesma
 * descrição normalizada, vale o mais recente.
 */
export async function buildReconciliationSuggestionIndex(
  supabase: SupabaseClient
): Promise<Map<string, ReconciliationSuggestion>> {
  const { data } = await supabase
    .from("reconciliation_links")
    .select(
      "created_at, bank_transactions(description), financial_settlements(financial_entries(type, category_id, subcategory_id, cost_center_id, counterparty_id, payment_method_id))"
    )
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const index = new Map<string, ReconciliationSuggestion>();

  for (const row of data ?? []) {
    const bankTransaction = row.bank_transactions as unknown as { description: string } | null;
    const entry = (row.financial_settlements as unknown as { financial_entries: any } | null)?.financial_entries;
    if (!bankTransaction || !entry) continue;

    const normalized = normalizeTransactionDescription(bankTransaction.description);
    if (!normalized) continue; // descrição sem nenhuma letra (raro) — não dá pra usar como chave

    const key = `${entry.type}|${normalized}`;
    if (index.has(key)) continue; // já temos uma ocorrência mais recente para esta chave

    index.set(key, {
      categoryId: entry.category_id ?? null,
      subcategoryId: entry.subcategory_id ?? null,
      costCenterId: entry.cost_center_id ?? null,
      counterpartyId: entry.counterparty_id ?? null,
      paymentMethodId: entry.payment_method_id ?? null,
      sourceDescription: bankTransaction.description,
    });
  }

  return index;
}

/** Chave de busca no índice, para uma transação pendente de conciliação. */
export function suggestionKey(description: string, amount: number): string {
  const type = amount >= 0 ? "receita" : "despesa";
  return `${type}|${normalizeTransactionDescription(description)}`;
}
