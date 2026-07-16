"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { costCenterSchema } from "@/lib/validation/centros-de-custo";
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

export async function createCostCenterAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("alterar_centros_de_custo");
  } catch {
    return { error: "Você não tem permissão para alterar centros de custo." };
  }

  const parsed = costCenterSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, userId, organizationId } = await getOrgIdAndUser();
  const { error } = await supabase.from("cost_centers").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    code: parsed.data.code || null,
    created_by: userId,
    updated_by: userId,
  });

  if (error) return { error: "Não foi possível criar o centro de custo." };
  revalidatePath("/cadastros/centros-de-custo");
  return { success: true };
}

export async function toggleCostCenterStatusAction(id: string, currentStatus: string) {
  await requirePermission("alterar_centros_de_custo");
  const { supabase, userId } = await getOrgIdAndUser();
  const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
  await supabase.from("cost_centers").update({ status: newStatus, updated_by: userId }).eq("id", id);
  revalidatePath("/cadastros/centros-de-custo");
}

export async function setDefaultCostCenterAction(id: string) {
  await requirePermission("alterar_centros_de_custo");
  const { supabase, userId, organizationId } = await getOrgIdAndUser();
  // Remove o padrão de qualquer outro centro de custo da organização
  await supabase
    .from("cost_centers")
    .update({ is_default: false, updated_by: userId })
    .eq("organization_id", organizationId)
    .eq("is_default", true);
  await supabase.from("cost_centers").update({ is_default: true, updated_by: userId }).eq("id", id);
  revalidatePath("/cadastros/centros-de-custo");
}
