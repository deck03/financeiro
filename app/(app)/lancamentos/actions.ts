"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import {
  entrySchema,
  settleSchema,
  cancelSchema,
  reverseSettlementSchema,
  installmentPlanSchema,
  recurringRuleSchema,
  cancelRecurringSchema,
} from "@/lib/validation/lancamentos";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
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

  await logAudit({
    action: "criar",
    entity: "financial_entries",
    entityId: inserted.id,
    newValue: { tipo: data.type, descricao: data.description, valor: data.original_amount, vencimento: data.due_date },
  });

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
// Liquidar (pagar/receber) um lançamento — integral ou parcial, com encargos.
// ---------------------------------------------------------------------------
export async function settleEntryFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = settleSchema.safeParse({
    entry_id: formData.get("entry_id"),
    bank_account_id: formData.get("bank_account_id"),
    settlement_date: formData.get("settlement_date"),
    payment_method_id: formData.get("payment_method_id"),
    notes: formData.get("notes"),
    amount: formData.get("amount") || "",
    interest: formData.get("interest") || "0",
    penalty: formData.get("penalty") || "0",
    discount: formData.get("discount") || "0",
    addition: formData.get("addition") || "0",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await getOrgIdAndUser();
  const { error } = await supabase.rpc("settle_entry", {
    p_entry_id: parsed.data.entry_id,
    p_bank_account_id: parsed.data.bank_account_id,
    p_settlement_date: parsed.data.settlement_date,
    p_amount: parsed.data.amount && parsed.data.amount !== "" ? Number(parsed.data.amount) : null,
    p_interest: parsed.data.interest ?? 0,
    p_penalty: parsed.data.penalty ?? 0,
    p_discount: parsed.data.discount ?? 0,
    p_addition: parsed.data.addition ?? 0,
    p_payment_method_id: emptyToNull(parsed.data.payment_method_id),
    p_notes: emptyToNull(parsed.data.notes),
  });

  if (error) {
    return {
      error: error.message.includes("permissão")
        ? "Você não tem permissão para esta ação."
        : error.message.includes("maior que o saldo")
          ? error.message
          : "Não foi possível registrar a liquidação.",
    };
  }

  await logAudit({
    action: "liquidar",
    entity: "financial_entries",
    entityId: parsed.data.entry_id,
    metadata: {
      data: parsed.data.settlement_date,
      valor: parsed.data.amount && parsed.data.amount !== "" ? Number(parsed.data.amount) : "integral",
    },
  });

  revalidatePath("/contas-a-pagar");
  revalidatePath("/contas-a-receber");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Estornar uma liquidação específica.
// ---------------------------------------------------------------------------
export async function reverseSettlementFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = reverseSettlementSchema.safeParse({
    settlement_id: formData.get("settlement_id"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }

  const { supabase } = await getOrgIdAndUser();
  const { error } = await supabase.rpc("reverse_settlement", {
    p_settlement_id: parsed.data.settlement_id,
    p_reason: emptyToNull(parsed.data.reason),
  });

  if (error) {
    return { error: error.message.includes("permissão") ? "Você não tem permissão para esta ação." : error.message };
  }

  await logAudit({
    action: "estornar",
    entity: "financial_settlements",
    entityId: parsed.data.settlement_id,
    metadata: { motivo: parsed.data.reason ?? null },
  });

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

  await logAudit({
    action: "cancelar",
    entity: "financial_entries",
    entityId: parsed.data.entry_id,
    metadata: { motivo: parsed.data.reason ?? null },
  });

  revalidatePath("/contas-a-pagar");
  revalidatePath("/contas-a-receber");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Criar parcelamento (N lançamentos vinculados).
// ---------------------------------------------------------------------------
export async function createInstallmentPlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("criar_lancamentos");
  } catch {
    return { error: "Você não tem permissão para criar lançamentos." };
  }

  const parsed = installmentPlanSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    counterparty_id: formData.get("counterparty_id"),
    category_id: formData.get("category_id"),
    subcategory_id: formData.get("subcategory_id"),
    cost_center_id: formData.get("cost_center_id"),
    bank_account_id: formData.get("bank_account_id"),
    payment_method_id: formData.get("payment_method_id"),
    total_amount: formData.get("total_amount"),
    installments_count: formData.get("installments_count"),
    first_due_date: formData.get("first_due_date"),
    recognition_strategy: formData.get("recognition_strategy"),
    competence_date: formData.get("competence_date"),
    document_number: formData.get("document_number"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const data = parsed.data;
  const { supabase } = await getOrgIdAndUser();

  const { error } = await supabase.rpc("create_installment_plan", {
    p_type: data.type,
    p_description: data.description,
    p_counterparty_id: emptyToNull(data.counterparty_id),
    p_category_id: data.category_id,
    p_subcategory_id: emptyToNull(data.subcategory_id),
    p_cost_center_id: emptyToNull(data.cost_center_id),
    p_bank_account_id: emptyToNull(data.bank_account_id),
    p_payment_method_id: emptyToNull(data.payment_method_id),
    p_total_amount: data.total_amount,
    p_installments_count: data.installments_count,
    p_first_due_date: data.first_due_date,
    p_recognition_strategy: data.recognition_strategy,
    p_document_number: emptyToNull(data.document_number),
    p_notes: emptyToNull(data.notes),
    p_competence_date: emptyToNull(data.competence_date),
  });

  if (error) {
    return { error: "Não foi possível criar o parcelamento." };
  }

  await logAudit({
    action: "criar",
    entity: "installment_groups",
    newValue: {
      tipo: data.type,
      descricao: data.description,
      valorTotal: data.total_amount,
      parcelas: data.installments_count,
      reconhecimento: data.recognition_strategy,
      dataCompetencia: data.recognition_strategy === "competencia_original" ? data.competence_date : null,
    },
  });

  revalidatePath(data.type === "despesa" ? "/contas-a-pagar" : "/contas-a-receber");
  redirect(data.type === "despesa" ? "/contas-a-pagar" : "/contas-a-receber");
}

// ---------------------------------------------------------------------------
// Criar recorrência (gera imediatamente as ocorrências dos próximos 12 meses).
// ---------------------------------------------------------------------------
export async function createRecurringRuleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("criar_lancamentos");
  } catch {
    return { error: "Você não tem permissão para criar lançamentos." };
  }

  const parsed = recurringRuleSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    counterparty_id: formData.get("counterparty_id"),
    category_id: formData.get("category_id"),
    subcategory_id: formData.get("subcategory_id"),
    cost_center_id: formData.get("cost_center_id"),
    bank_account_id: formData.get("bank_account_id"),
    payment_method_id: formData.get("payment_method_id"),
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    interval_count: formData.get("interval_count") || "1",
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    max_occurrences: formData.get("max_occurrences") || "",
    adjust_business_day: formData.get("adjust_business_day") === "on",
    competence_anchor_date: formData.get("competence_anchor_date"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const data = parsed.data;
  const { supabase, userId, organizationId } = await getOrgIdAndUser();

  const { data: rule, error } = await supabase
    .from("recurring_rules")
    .insert({
      organization_id: organizationId,
      type: data.type,
      description: data.description,
      counterparty_id: emptyToNull(data.counterparty_id),
      category_id: data.category_id,
      subcategory_id: emptyToNull(data.subcategory_id),
      cost_center_id: emptyToNull(data.cost_center_id),
      bank_account_id: emptyToNull(data.bank_account_id),
      payment_method_id: emptyToNull(data.payment_method_id),
      amount: data.amount,
      frequency: data.frequency,
      interval_count: data.interval_count,
      start_date: data.start_date,
      end_date: emptyToNull(data.end_date),
      max_occurrences: data.max_occurrences && data.max_occurrences !== "" ? Number(data.max_occurrences) : null,
      adjust_business_day: data.adjust_business_day ?? false,
      competence_anchor_date: emptyToNull(data.competence_anchor_date),
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (error || !rule) {
    return { error: "Não foi possível criar a recorrência." };
  }

  await supabase.rpc("generate_recurring_instances", { p_rule_id: rule.id, p_months_ahead: 12 });

  await logAudit({
    action: "criar",
    entity: "recurring_rules",
    entityId: rule.id,
    newValue: {
      tipo: data.type,
      descricao: data.description,
      valor: data.amount,
      frequencia: data.frequency,
      ancoraCompetencia: data.competence_anchor_date || null,
    },
  });

  revalidatePath("/recorrencias");
  redirect("/recorrencias");
}

// ---------------------------------------------------------------------------
// Gerar mais ocorrências de uma recorrência já existente.
// ---------------------------------------------------------------------------
export async function generateMoreOccurrencesAction(ruleId: string) {
  const { supabase } = await getOrgIdAndUser();
  await supabase.rpc("generate_recurring_instances", { p_rule_id: ruleId, p_months_ahead: 12 });
  await logAudit({ action: "gerar", entity: "recurring_rules", entityId: ruleId, metadata: { acao: "gerar ocorrências (+12 meses)" } });
  revalidatePath("/recorrencias");
}

// ---------------------------------------------------------------------------
// Cancelar ocorrências de uma recorrência, por escopo.
// ---------------------------------------------------------------------------
export async function cancelRecurringFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = cancelRecurringSchema.safeParse({
    rule_id: formData.get("rule_id"),
    scope: formData.get("scope"),
    from_entry_id: formData.get("from_entry_id"),
  });

  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }

  const { supabase } = await getOrgIdAndUser();
  const { error } = await supabase.rpc("cancel_recurring_occurrences", {
    p_rule_id: parsed.data.rule_id,
    p_scope: parsed.data.scope,
    p_from_entry_id: emptyToNull(parsed.data.from_entry_id),
  });

  if (error) {
    return { error: error.message.includes("permissão") ? "Você não tem permissão para esta ação." : error.message };
  }

  await logAudit({
    action: "cancelar",
    entity: "recurring_rules",
    entityId: parsed.data.rule_id,
    metadata: { escopo: parsed.data.scope },
  });

  revalidatePath("/recorrencias");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/contas-a-receber");
  return { success: true };
}
