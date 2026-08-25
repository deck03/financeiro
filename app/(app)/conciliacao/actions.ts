"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { reconcileExistingSchema, reconcileNewEntrySchema } from "@/lib/validation/ofx";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export type FormState = { error?: string; success?: boolean };

async function getSupabase() {
  return createClient();
}

export async function reconcileWithExistingEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("realizar_conciliacao");
  } catch {
    return { error: "Você não tem permissão para conciliar transações." };
  }

  const parsed = reconcileExistingSchema.safeParse({
    bank_transaction_id: formData.get("bank_transaction_id"),
    entry_id: formData.get("entry_id"),
    amount: formData.get("amount") || undefined,
    mark_as_fully_settled: formData.get("mark_as_fully_settled") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await getSupabase();
  // O cast abaixo evita que o build quebre se lib/types/database.ts estiver
  // um passo atrás desta função no banco (o parâmetro novo
  // p_mark_as_fully_settled não está descrito nos tipos gerados ainda) —
  // a chamada em si continua funcionando normalmente, só a checagem de
  // tipo estrita é contornada para este nome de função específico. Mesmo
  // padrão já usado em deletePendingTransactionsAction.
  const { error } = (await (supabase.rpc as any)("reconcile_with_existing_entry", {
    p_bank_transaction_id: parsed.data.bank_transaction_id,
    p_entry_id: parsed.data.entry_id,
    p_amount: parsed.data.amount ?? null,
    p_mark_as_fully_settled: parsed.data.mark_as_fully_settled ?? false,
  })) as { error: { message: string } | null };

  if (error) {
    return { error: error.message.includes("permissão") ? "Você não tem permissão para esta ação." : error.message };
  }

  await logAudit({
    action: "conciliar",
    entity: "bank_transactions",
    entityId: parsed.data.bank_transaction_id,
    metadata: {
      modo: "vincular a lançamento existente",
      lancamento: parsed.data.entry_id,
      liquidacaoTotalForcada: parsed.data.mark_as_fully_settled ?? false,
    },
  });

  revalidatePath("/conciliacao");
  return { success: true };
}

export async function reconcileWithNewEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("realizar_conciliacao");
  } catch {
    return { error: "Você não tem permissão para conciliar transações." };
  }

  // formData.get() retorna null (não undefined) para campos que não existem
  // no formulário — aqui, document_number e notes nunca tiveram input no
  // formulário de "Criar lançamento" da conciliação. z.optional() só aceita
  // undefined, não null, então isso quebrava a validação com o erro
  // genérico "Invalid input" (mesma causa-raiz já corrigida em relatórios,
  // parcelamento/recorrência e contas bancárias).
  const parsed = reconcileNewEntrySchema.safeParse({
    bank_transaction_id: formData.get("bank_transaction_id"),
    category_id: formData.get("category_id"),
    description: formData.get("description") ?? "",
    counterparty_id: formData.get("counterparty_id") ?? "",
    subcategory_id: formData.get("subcategory_id") ?? "",
    cost_center_id: formData.get("cost_center_id") ?? "",
    payment_method_id: formData.get("payment_method_id") ?? "",
    document_number: formData.get("document_number") ?? "",
    notes: formData.get("notes") ?? "",
    competence_date: formData.get("competence_date") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const emptyToNull = (v: string | undefined) => (v && v !== "" ? v : null);
  const supabase = await getSupabase();

  const { error } = await supabase.rpc("reconcile_with_new_entry", {
    p_bank_transaction_id: parsed.data.bank_transaction_id,
    p_category_id: parsed.data.category_id,
    p_description: emptyToNull(parsed.data.description),
    p_counterparty_id: emptyToNull(parsed.data.counterparty_id),
    p_subcategory_id: emptyToNull(parsed.data.subcategory_id),
    p_cost_center_id: emptyToNull(parsed.data.cost_center_id),
    p_payment_method_id: emptyToNull(parsed.data.payment_method_id),
    p_document_number: emptyToNull(parsed.data.document_number),
    p_notes: emptyToNull(parsed.data.notes),
    p_competence_date: emptyToNull(parsed.data.competence_date),
  });

  if (error) {
    return { error: error.message.includes("permissão") ? "Você não tem permissão para esta ação." : "Não foi possível criar o lançamento." };
  }

  await logAudit({
    action: "conciliar",
    entity: "bank_transactions",
    entityId: parsed.data.bank_transaction_id,
    metadata: { modo: "criar novo lançamento" },
  });

  revalidatePath("/conciliacao");
  return { success: true };
}

export async function ignoreBankTransactionAction(bankTransactionId: string) {
  const supabase = await getSupabase();
  await supabase.rpc("ignore_bank_transaction", { p_bank_transaction_id: bankTransactionId });
  await logAudit({ action: "ignorar", entity: "bank_transactions", entityId: bankTransactionId });
  revalidatePath("/conciliacao");
}

export async function unignoreBankTransactionAction(bankTransactionId: string) {
  const supabase = await getSupabase();
  await supabase.rpc("unignore_bank_transaction", { p_bank_transaction_id: bankTransactionId });
  await logAudit({ action: "reativar", entity: "bank_transactions", entityId: bankTransactionId });
  revalidatePath("/conciliacao");
}

export async function undoReconciliationAction(bankTransactionId: string) {
  const supabase = await getSupabase();
  await supabase.rpc("undo_reconciliation", { p_bank_transaction_id: bankTransactionId });
  await logAudit({ action: "desfazer_conciliacao", entity: "bank_transactions", entityId: bankTransactionId });
  revalidatePath("/conciliacao");
}

// ---------------------------------------------------------------------------
// Excluir transações bancárias pendentes (ainda não conciliadas).
//
// Útil para corrigir situações como uma contagem que não bate com o arquivo
// original (ex.: sobras de um teste de importação anterior). Como uma
// transação "não conciliada" nunca virou lançamento, excluir não afeta
// nenhum dado financeiro real — só remove a cópia do extrato dentro do
// sistema. A proteção contra excluir algo já conciliado/ignorado está tanto
// na política de RLS quanto na função do banco (defesa em profundidade).
// ---------------------------------------------------------------------------
export async function deletePendingTransactionsAction(
  bankAccountId: string
): Promise<{ error?: string; deletedCount?: number }> {
  try {
    await requirePermission("importar_ofx");
  } catch {
    return { error: "Você não tem permissão para excluir transações importadas." };
  }

  const supabase = createClient();
  // O cast abaixo evita que o build quebre se lib/types/database.ts estiver
  // um passo atrás desta função no banco (ex.: o arquivo não subiu junto
  // numa atualização feita por arrasta-e-solta) — a chamada em si continua
  // funcionando normalmente, só a checagem de tipo estrita é contornada
  // para este nome de função específico.
  const { data, error } = (await (supabase.rpc as any)("delete_pending_bank_transactions", {
    p_bank_account_id: bankAccountId,
  })) as { data: number | null; error: { message: string } | null };

  if (error) {
    return { error: "Não foi possível excluir as transações pendentes." };
  }

  revalidatePath("/conciliacao");
  return { deletedCount: data ?? 0 };
}

/** Exclui uma única transação pendente (ex.: uma linha claramente errada, sem precisar limpar tudo). */
export async function deleteSinglePendingTransactionAction(bankTransactionId: string): Promise<{ error?: string }> {
  try {
    await requirePermission("importar_ofx");
  } catch {
    return { error: "Você não tem permissão para excluir transações importadas." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("bank_transactions")
    .delete()
    .eq("id", bankTransactionId)
    .eq("status", "nao_conciliada");

  if (error) {
    return { error: "Não foi possível excluir esta transação." };
  }

  await logAudit({ action: "excluir_pendentes", entity: "bank_transactions", entityId: bankTransactionId });
  revalidatePath("/conciliacao");
  return {};
}
