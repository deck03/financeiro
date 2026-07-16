"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { transferSchema } from "@/lib/validation/transferencias";
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

  revalidatePath("/transferencias");
  revalidatePath("/cadastros/contas-bancarias");
  return { success: true };
}
