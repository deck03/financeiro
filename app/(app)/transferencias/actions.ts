"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { transferSchema, updateTransferSchema, cancelTransferSchema } from "@/lib/validation/transferencias";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

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

// Toda ação que move dinheiro entre contas (criar, editar, cancelar,
// excluir) revalida as mesmas telas — o saldo das contas, a DRE e o
// fluxo de caixa são calculados a partir da tabela transfers, então
// qualquer mudança aqui precisa refletir em todas elas.
function revalidateTransferRelatedPaths() {
  revalidatePath("/transferencias");
  revalidatePath("/cadastros/contas-bancarias");
  revalidatePath("/dashboard");
  revalidatePath("/fluxo-de-caixa/realizado");
  revalidatePath("/dre");
}

export async function createTransferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("criar_transferencias");
  } catch {
    return { error: "Você não tem permissão para criar transferências." };
  }

  const parsed = transferSchema.safeParse({
    from_bank_account_id: formData.get("from_bank_account_id"),
    to_bank_account_id: formData.get("to_bank_account_id"),
    amount: formData.get("amount"),
    transfer_date: formData.get("transfer_date"),
    classification: formData.get("classification"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await getOrgIdAndUser();
  const { error } = await supabase.rpc("create_transfer", {
    p_from_bank_account_id: parsed.data.from_bank_account_id,
    p_to_bank_account_id: parsed.data.to_bank_account_id,
    p_amount: parsed.data.amount,
    p_transfer_date: parsed.data.transfer_date,
    p_classification: parsed.data.classification,
    p_notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: error.message.includes("titularidades") ? error.message : "Não foi possível criar a transferência." };
  }

  await logAudit({
    action: "criar",
    entity: "transfers",
    newValue: {
      valor: parsed.data.amount,
      data: parsed.data.transfer_date,
      classificacao: parsed.data.classification,
    },
  });

  revalidateTransferRelatedPaths();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Editar uma transferência já existente. Como o saldo das contas é
// calculado a partir desta tabela (não armazenado), corrigir valor/data/
// contas/classificação aqui já reflete sozinho em Contas bancárias, DRE e
// Fluxo de caixa — sem precisar ajustar nada manualmente em outro lugar.
// Permitido mesmo numa transferência já cancelada (só corrige o registro;
// uma cancelada continua fora do cálculo de saldo de qualquer forma).
// ---------------------------------------------------------------------------
export async function updateTransferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("criar_transferencias");
  } catch {
    return { error: "Você não tem permissão para editar transferências." };
  }

  const parsed = updateTransferSchema.safeParse({
    transfer_id: formData.get("transfer_id"),
    from_bank_account_id: formData.get("from_bank_account_id"),
    to_bank_account_id: formData.get("to_bank_account_id"),
    amount: formData.get("amount"),
    transfer_date: formData.get("transfer_date"),
    classification: formData.get("classification"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await getOrgIdAndUser();
  const { error } = await supabase.rpc("update_transfer", {
    p_transfer_id: parsed.data.transfer_id,
    p_from_bank_account_id: parsed.data.from_bank_account_id,
    p_to_bank_account_id: parsed.data.to_bank_account_id,
    p_amount: parsed.data.amount,
    p_transfer_date: parsed.data.transfer_date,
    p_classification: parsed.data.classification,
    p_notes: parsed.data.notes || null,
  });

  if (error) {
    return {
      error: error.message.includes("titularidades") || error.message.includes("mesma")
        ? error.message
        : "Não foi possível salvar as alterações.",
    };
  }

  revalidateTransferRelatedPaths();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Cancelar (estornar) uma transferência — some do cálculo de saldo, mas o
// registro continua existindo, igual já acontece com liquidações
// estornadas. Nunca apaga nada; use "excluir" para isso.
// ---------------------------------------------------------------------------
export async function cancelTransferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("criar_transferencias");
  } catch {
    return { error: "Você não tem permissão para cancelar transferências." };
  }

  const parsed = cancelTransferSchema.safeParse({
    transfer_id: formData.get("transfer_id"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }

  const { supabase } = await getOrgIdAndUser();
  const { error } = await supabase.rpc("cancel_transfer", {
    p_transfer_id: parsed.data.transfer_id,
    p_reason: parsed.data.reason || null,
  });

  if (error) {
    return { error: error.message.includes("já está cancelada") ? error.message : "Não foi possível cancelar." };
  }

  revalidateTransferRelatedPaths();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Excluir uma transferência de verdade — diferente de cancelar, não deixa
// vestígio nenhum. Seguro porque nenhuma outra tabela referencia uma
// transferência (nem liquidação, nem recibo, nem conciliação).
// ---------------------------------------------------------------------------
export async function deleteTransferAction(transferId: string): Promise<{ error?: string }> {
  try {
    await requirePermission("criar_transferencias");
  } catch {
    return { error: "Você não tem permissão para excluir transferências." };
  }

  const { supabase } = await getOrgIdAndUser();
  const { data: item } = await supabase
    .from("transfers")
    .select("amount, transfer_date, classification")
    .eq("id", transferId)
    .single();

  const { error } = await supabase.from("transfers").delete().eq("id", transferId);

  if (error) {
    return { error: "Não foi possível excluir a transferência." };
  }

  await logAudit({
    action: "excluir",
    entity: "transfers",
    entityId: transferId,
    metadata: item ? { valor: item.amount, data: item.transfer_date, classificacao: item.classification } : undefined,
  });

  revalidateTransferRelatedPaths();
  return {};
}
