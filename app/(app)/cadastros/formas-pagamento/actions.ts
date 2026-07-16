"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { paymentMethodSchema } from "@/lib/validation/formas-pagamento";
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

export async function createPaymentMethodAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("alterar_formas_pagamento");
  } catch {
    return { error: "Você não tem permissão para alterar formas de pagamento." };
  }

  const parsed = paymentMethodSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, userId, organizationId } = await getOrgIdAndUser();
  const { error } = await supabase.from("payment_methods").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    created_by: userId,
    updated_by: userId,
  });

  if (error) return { error: "Não foi possível criar a forma de pagamento." };
  revalidatePath("/cadastros/formas-pagamento");
  return { success: true };
}

export async function togglePaymentMethodStatusAction(id: string, currentStatus: string) {
  await requirePermission("alterar_formas_pagamento");
  const { supabase, userId } = await getOrgIdAndUser();
  const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
  await supabase.from("payment_methods").update({ status: newStatus, updated_by: userId }).eq("id", id);
  revalidatePath("/cadastros/formas-pagamento");
}
