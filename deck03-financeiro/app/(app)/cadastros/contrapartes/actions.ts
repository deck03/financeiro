"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { counterpartySchema } from "@/lib/validation/contrapartes";
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

export async function createCounterpartyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("criar_contrapartes");
  } catch {
    return { error: "Você não tem permissão para criar contrapartes." };
  }

  const parsed = counterpartySchema.safeParse({
    name: formData.get("name"),
    trade_name: formData.get("trade_name"),
    document_number: formData.get("document_number"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    types: formData.getAll("types"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, userId, organizationId } = await getOrgIdAndUser();
  const { error } = await supabase.from("counterparties").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    trade_name: parsed.data.trade_name || null,
    document_number: parsed.data.document_number || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    address: parsed.data.address || null,
    types: parsed.data.types,
    notes: parsed.data.notes || null,
    created_by: userId,
    updated_by: userId,
  });

  if (error) return { error: "Não foi possível criar a contraparte." };
  revalidatePath("/cadastros/contrapartes");
  return { success: true };
}

export async function toggleCounterpartyStatusAction(id: string, currentStatus: string) {
  await requirePermission("editar_contrapartes");
  const { supabase, userId } = await getOrgIdAndUser();
  const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
  await supabase.from("counterparties").update({ status: newStatus, updated_by: userId }).eq("id", id);
  revalidatePath("/cadastros/contrapartes");
}
