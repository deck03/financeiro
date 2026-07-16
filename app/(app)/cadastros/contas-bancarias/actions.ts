"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { bankAccountSchema } from "@/lib/validation/contas-bancarias";
import { balanceSnapshotSchema } from "@/lib/validation/transferencias";
import { revalidatePath } from "next/cache";

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

export async function createBankAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("alterar_contas_bancarias");
  } catch {
    return { error: "Você não tem permissão para alterar contas bancárias." };
  }

  const parsed = bankAccountSchema.safeParse({
    display_name: formData.get("display_name"),
    bank_name: formData.get("bank_name"),
    agency: formData.get("agency"),
    account_number: formData.get("account_number"),
    account_type: formData.get("account_type"),
    ownership: formData.get("ownership"),
    holder_name: formData.get("holder_name"),
    document_number: formData.get("document_number"),
    initial_balance: formData.get("initial_balance") || "0",
    initial_balance_date: formData.get("initial_balance_date"),
    minimum_balance: formData.get("minimum_balance") || "",
    consider_in_available_balance: formData.get("consider_in_available_balance") === "on",
    consider_in_business_dashboard: formData.get("consider_in_business_dashboard") === "on",
    allow_ofx_import: formData.get("allow_ofx_import") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, userId, organizationId } = await getOrgIdAndUser();
  const { error } = await supabase.from("bank_accounts").insert({
    organization_id: organizationId,
    display_name: parsed.data.display_name,
    bank_name: parsed.data.bank_name || null,
    agency: parsed.data.agency || null,
    account_number: parsed.data.account_number || null,
    account_type: parsed.data.account_type,
    ownership: parsed.data.ownership,
    holder_name: parsed.data.holder_name || null,
    document_number: parsed.data.document_number || null,
    initial_balance: parsed.data.initial_balance,
    initial_balance_date: parsed.data.initial_balance_date,
    minimum_balance: parsed.data.minimum_balance,
    consider_in_available_balance: parsed.data.consider_in_available_balance ?? false,
    consider_in_business_dashboard: parsed.data.consider_in_business_dashboard ?? false,
    allow_ofx_import: parsed.data.allow_ofx_import ?? false,
    created_by: userId,
    updated_by: userId,
  });

  if (error) return { error: "Não foi possível criar a conta bancária." };
  revalidatePath("/cadastros/contas-bancarias");
  return { success: true };
}

export async function toggleBankAccountStatusAction(id: string, currentStatus: string) {
  await requirePermission("alterar_contas_bancarias");
  const { supabase, userId } = await getOrgIdAndUser();
  const newStatus = currentStatus === "ativa" ? "inativa" : "ativa";
  await supabase.from("bank_accounts").update({ status: newStatus, updated_by: userId }).eq("id", id);
  revalidatePath("/cadastros/contas-bancarias");
}

export async function createBalanceSnapshotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("alterar_contas_bancarias");
  } catch {
    return { error: "Você não tem permissão para registrar conferências de saldo." };
  }

  const parsed = balanceSnapshotSchema.safeParse({
    bank_account_id: formData.get("bank_account_id"),
    snapshot_date: formData.get("snapshot_date"),
    informed_balance: formData.get("informed_balance"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, userId, organizationId } = await getOrgIdAndUser();

  const { data: calculatedBalance } = await supabase.rpc("bank_account_balance", {
    p_account_id: parsed.data.bank_account_id,
  });

  const { error } = await supabase.from("bank_balance_snapshots").insert({
    organization_id: organizationId,
    bank_account_id: parsed.data.bank_account_id,
    snapshot_date: parsed.data.snapshot_date,
    calculated_balance: calculatedBalance ?? 0,
    informed_balance: parsed.data.informed_balance,
    notes: parsed.data.notes || null,
    created_by: userId,
  });

  if (error) return { error: "Não foi possível registrar a conferência de saldo." };

  revalidatePath(`/cadastros/contas-bancarias/${parsed.data.bank_account_id}`);
  return { success: true };
}
