"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { reconcileExistingSchema, reconcileNewEntrySchema } from "@/lib/validation/ofx";
import { revalidatePath } from "next/cache";

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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc("reconcile_with_existing_entry", {
    p_bank_transaction_id: parsed.data.bank_transaction_id,
    p_entry_id: parsed.data.entry_id,
    p_amount: parsed.data.amount ?? null,
  });

  if (error) {
    return { error: error.message.includes("permissão") ? "Você não tem permissão para esta ação." : error.message };
  }

  revalidatePath("/conciliacao");
  return { success: true };
}

export async function reconcileWithNewEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("realizar_conciliacao");
  } catch {
    return { error: "Você não tem permissão para conciliar transações." };
  }

  const parsed = reconcileNewEntrySchema.safeParse({
    bank_transaction_id: formData.get("bank_transaction_id"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    counterparty_id: formData.get("counterparty_id"),
    subcategory_id: formData.get("subcategory_id"),
    cost_center_id: formData.get("cost_center_id"),
    payment_method_id: formData.get("payment_method_id"),
    document_number: formData.get("document_number"),
    notes: formData.get("notes"),
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
  });

  if (error) {
    return { error: error.message.includes("permissão") ? "Você não tem permissão para esta ação." : "Não foi possível criar o lançamento." };
  }

  revalidatePath("/conciliacao");
  return { success: true };
}

export async function ignoreBankTransactionAction(bankTransactionId: string) {
  const supabase = await getSupabase();
  await supabase.rpc("ignore_bank_transaction", { p_bank_transaction_id: bankTransactionId });
  revalidatePath("/conciliacao");
}

export async function unignoreBankTransactionAction(bankTransactionId: string) {
  const supabase = await getSupabase();
  await supabase.rpc("unignore_bank_transaction", { p_bank_transaction_id: bankTransactionId });
  revalidatePath("/conciliacao");
}

export async function undoReconciliationAction(bankTransactionId: string) {
  const supabase = await getSupabase();
  await supabase.rpc("undo_reconciliation", { p_bank_transaction_id: bankTransactionId });
  revalidatePath("/conciliacao");
}
