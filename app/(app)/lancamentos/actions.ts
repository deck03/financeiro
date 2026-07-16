"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { entrySchema, settleSchema, cancelSchema } from "@/lib/validation/lancamentos";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type FormState = { error?: string; success?: boolean };

async function getOrgIdAndUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user!.id)
    .single();
  return { supabase, userId: user!.id, organizationId: profile!.organization_id };
}

function emptyToNull(value: string | undefined | null) {
  return value && value !== "" ? value : null;
}

// ---------------------------------------------------------------------------
// Criar lançamento (conta a pagar ou a receber). Se "already_settled" vier
// marcado, cria o lançamento e, na sequência, chama a mesma função de
// liquidação usada pela tela de detalhe — não duplica a regra de negócio.
// ---------------------------------------------------------------------------
export async function createEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("criar_lancamentos");
  } catch {
    return { error: "Você não tem permissão para criar lançamentos." };
  }

  const parsed = entrySchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    counterparty_id: formData.get("counterparty_id"),
    category_id: formData.get("category_id"),
    subcategory_id: formData.get("subcategory_id"),
    cost_center_id: formData.get("cost_center_id"),
    bank_account_id: formData.get("bank_account_id"),
    payment_method_id: formData.get("payment_method_id"),
    original_amount: formData.get("original_amount"),
    issue_date: formData.get("issue_date"),
    competence_date: formData.get("competence_date"),
    due_date: formData.get("due_date"),
    document_number: formData.get("document_number"),
    notes: formData.get("notes"),
    already_settled: formData.get("already_settled") === "on",
    settlement_date: formData.get("settlement_date"),
    settlement_bank_account_id: formData.get("settlement_bank_account_id"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const data = parsed.data;

  if (data.already_settled) {
    if (!data.settlement_date) {
      return { error: "Informe a data em que o lançamento foi liquidado." };
    }
    if (!data.settlement_bank_account_id) {
      return { error: "Selecione a conta bancária usada na liquidação." };
    }
  }

  const { supabase, userId, organizationId } = await getOrgIdAndUser();

  const { data: inserted, error } = await supabase
    .from("financial_entries")
    .insert({
      organization_id: organizationId,
      type: data.type,
      description: data.description,
      counterparty_id: emptyToNull(data.counterparty_id),
      category_id: data.category_id,
      subcategory_id: emptyToNull(data.subcategory_id),
      cost_center_id: emptyToNull(data.cost_center_id),
      bank_account_id: emptyToNull(data.bank_account_id) ?? emptyToNull(data.settlement_bank_account_id),
      payment_method_id: emptyToNull(data.payment_method_id),
      original_amount: data.original_amount,
      issue_date: emptyToNull(data.issue_date),
      competence_date: emptyToNull(data.competence_date),
      due_date: data.due_date,
      document_number: emptyToNull(data.document_number),
      notes: emptyToNull(data.notes),
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: "Não foi possível criar o lançamento." };
  }

  if (data.already_settled) {
    const { error: settleError } = await supabase.rpc("settle_entry", {
      p_entry_id: inserted.id,
      p_bank_account_id: data.settlement_bank_account_id as string,
      p_settlement_date: data.settlement_date as string,
      p_payment_method_id: emptyToNull(data.payment_method_id),
      p_notes: null,
    });
    if (settleError) {
      return {
        error:
          "O lançamento foi criado, mas não foi possível registrar a liquidação automaticamente. Abra o lançamento e registre manualmente.",
      };
    }
  }

  revalidatePath(data.type === "despesa" ? "/contas-a-pagar" : "/contas-a-receber");
  redirect(data.type === "despesa" ? "/contas-a-pagar" : "/contas-a-receber");
}

// ---------------------------------------------------------------------------
// Liquidar (pagar/receber) um lançamento — valor integral (Fase 3).
// ---------------------------------------------------------------------------
export async function settleEntryFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = settleSchema.safeParse({
    entry_id: formData.get("entry_id"),
    bank_account_id: formData.get("bank_account_id"),
    settlement_date: formData.get("settlement_date"),
    payment_method_id: formData.get("payment_method_id"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await getOrgIdAndUser();
  const { error } = await supabase.rpc("settle_entry", {
    p_entry_id: parsed.data.entry_id,
    p_bank_account_id: parsed.data.bank_account_id,
    p_settlement_date: parsed.data.settlement_date,
    p_payment_method_id: emptyToNull(parsed.data.payment_method_id),
    p_notes: emptyToNull(parsed.data.notes),
  });

  if (error) {
    return { error: error.message.includes("Sem permissão") ? "Você não tem permissão para esta ação." : "Não foi possível registrar a liquidação." };
  }

  revalidatePath("/contas-a-pagar");
  revalidatePath("/contas-a-receber");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Cancelar um lançamento (só antes de qualquer liquidação).
// ---------------------------------------------------------------------------
export async function cancelEntryFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = cancelSchema.safeParse({
    entry_id: formData.get("entry_id"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }

  const { supabase } = await getOrgIdAndUser();
  const { error } = await supabase.rpc("cancel_entry", {
    p_entry_id: parsed.data.entry_id,
    p_reason: emptyToNull(parsed.data.reason),
  });

  if (error) {
    return { error: error.message.includes("Sem permissão") ? "Você não tem permissão para esta ação." : error.message };
  }

  revalidatePath("/contas-a-pagar");
  revalidatePath("/contas-a-receber");
  return { success: true };
}
