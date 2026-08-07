"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import {
  chartFamilySchema,
  chartCategorySchema,
  chartSubcategorySchema,
} from "@/lib/validation/plano-de-contas";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

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

export type FormState = { error?: string; success?: boolean };

// ---------------------------------------------------------------------------
// Famílias
// ---------------------------------------------------------------------------
export async function createFamilyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("alterar_plano_de_contas");
  } catch {
    return { error: "Você não tem permissão para alterar o plano de contas." };
  }

  const parsed = chartFamilySchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    type: formData.get("type"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, userId, organizationId } = await getOrgIdAndUser();
  const { error } = await supabase.from("chart_account_families").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    code: parsed.data.code || null,
    type: parsed.data.type,
    created_by: userId,
    updated_by: userId,
  });

  if (error) return { error: "Não foi possível criar a família." };
  await logAudit({ action: "criar", entity: "chart_account_families", newValue: { nome: parsed.data.name, tipo: parsed.data.type } });
  revalidatePath("/cadastros/plano-de-contas");
  return { success: true };
}

export async function toggleFamilyStatusAction(id: string, currentStatus: string) {
  await requirePermission("alterar_plano_de_contas");
  const { supabase, userId } = await getOrgIdAndUser();
  const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
  await supabase
    .from("chart_account_families")
    .update({ status: newStatus, updated_by: userId })
    .eq("id", id);
  await logAudit({ action: newStatus === "ativo" ? "ativar" : "desativar", entity: "chart_account_families", entityId: id });
  revalidatePath("/cadastros/plano-de-contas");
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------
export async function createCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("alterar_plano_de_contas");
  } catch {
    return { error: "Você não tem permissão para alterar o plano de contas." };
  }

  const parsed = chartCategorySchema.safeParse({
    family_id: formData.get("family_id"),
    name: formData.get("name"),
    code: formData.get("code"),
    managerial_nature: formData.get("managerial_nature"),
    dre_behavior: formData.get("dre_behavior"),
    cashflow_behavior: formData.get("cashflow_behavior"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, userId, organizationId } = await getOrgIdAndUser();
  const { error } = await supabase.from("chart_account_categories").insert({
    organization_id: organizationId,
    family_id: parsed.data.family_id,
    name: parsed.data.name,
    code: parsed.data.code || null,
    managerial_nature: parsed.data.managerial_nature,
    dre_behavior: parsed.data.dre_behavior,
    cashflow_behavior: parsed.data.cashflow_behavior,
    created_by: userId,
    updated_by: userId,
  });

  if (error) return { error: "Não foi possível criar a categoria." };
  await logAudit({
    action: "criar",
    entity: "chart_account_categories",
    newValue: { nome: parsed.data.name, comportamentoDre: parsed.data.dre_behavior },
  });
  revalidatePath("/cadastros/plano-de-contas");
  return { success: true };
}

export async function toggleCategoryStatusAction(id: string, currentStatus: string) {
  await requirePermission("alterar_plano_de_contas");
  const { supabase, userId } = await getOrgIdAndUser();
  const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
  await supabase
    .from("chart_account_categories")
    .update({ status: newStatus, updated_by: userId })
    .eq("id", id);
  await logAudit({ action: newStatus === "ativo" ? "ativar" : "desativar", entity: "chart_account_categories", entityId: id });
  revalidatePath("/cadastros/plano-de-contas");
}

// ---------------------------------------------------------------------------
// Subcategorias
// ---------------------------------------------------------------------------
export async function createSubcategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("alterar_plano_de_contas");
  } catch {
    return { error: "Você não tem permissão para alterar o plano de contas." };
  }

  const parsed = chartSubcategorySchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, userId, organizationId } = await getOrgIdAndUser();
  const { error } = await supabase.from("chart_account_subcategories").insert({
    organization_id: organizationId,
    category_id: parsed.data.category_id,
    name: parsed.data.name,
    code: parsed.data.code || null,
    created_by: userId,
    updated_by: userId,
  });

  if (error) return { error: "Não foi possível criar a subcategoria." };
  await logAudit({ action: "criar", entity: "chart_account_subcategories", newValue: { nome: parsed.data.name } });
  revalidatePath("/cadastros/plano-de-contas");
  return { success: true };
}

export async function toggleSubcategoryStatusAction(id: string, currentStatus: string) {
  await requirePermission("alterar_plano_de_contas");
  const { supabase, userId } = await getOrgIdAndUser();
  const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
  await supabase
    .from("chart_account_subcategories")
    .update({ status: newStatus, updated_by: userId })
    .eq("id", id);
  await logAudit({ action: newStatus === "ativo" ? "ativar" : "desativar", entity: "chart_account_subcategories", entityId: id });
  revalidatePath("/cadastros/plano-de-contas");
}
