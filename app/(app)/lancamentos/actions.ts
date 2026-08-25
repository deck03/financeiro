"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import {
  entrySchema,
  updateEntrySchema,
  settleSchema,
  cancelSchema,
  reverseSettlementSchema,
  updateSettlementSchema,
  installmentPlanSchema,
  recurringRuleSchema,
  updateRecurringRuleSchema,
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

  // formData.get() retorna null (não undefined) para um campo ausente do
  // formulário — aqui isso acontece sempre com "issue_date" (nunca teve
  // input neste formulário) e com "bank_account_id" quando "já foi pago"
  // está marcado (o campo alterna para settlement_bank_account_id nesse
  // caso). z.optional() só aceita undefined, não null — sem o "?? ''"
  // abaixo, isso quebra a validação com o erro genérico "Invalid input"
  // (mesma causa-raiz já corrigida em outros formulários).
  const parsed = entrySchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    counterparty_id: formData.get("counterparty_id") ?? "",
    category_id: formData.get("category_id"),
    subcategory_id: formData.get("subcategory_id") ?? "",
    cost_center_id: formData.get("cost_center_id") ?? "",
    bank_account_id: formData.get("bank_account_id") ?? "",
    payment_method_id: formData.get("payment_method_id") ?? "",
    original_amount: formData.get("original_amount"),
    issue_date: formData.get("issue_date") ?? "",
    competence_date: formData.get("competence_date") ?? "",
    due_date: formData.get("due_date"),
    document_number: formData.get("document_number") ?? "",
    notes: formData.get("notes") ?? "",
    already_settled: formData.get("already_settled") === "on",
    settlement_date: formData.get("settlement_date") ?? "",
    settlement_bank_account_id: formData.get("settlement_bank_account_id") ?? "",
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
// Editar um lançamento ainda em aberto (nunca liquidado, nem parcialmente).
//
// A política de RLS já previa esta ação desde a Fase 3 (permissão
// 'editar_lancamentos_em_aberto'). A pedido do usuário, a edição passou a
// valer para QUALQUER lançamento, independente do status — inclusive já
// pago/recebido (mesmo parcialmente), cancelado ou estornado — sem
// precisar estornar a liquidação antes só para corrigir um dado (ex.:
// categoria errada, descrição com erro de digitação).
//
// Atenção: alterar o valor (original_amount) de um lançamento que já tem
// liquidação registrada muda o saldo restante calculado (original_amount
// menos a soma das liquidações válidas) — a tela avisa sobre isso, mas a
// action não bloqueia, por decisão explícita do usuário.
// ---------------------------------------------------------------------------
export async function updateEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("editar_lancamentos_em_aberto");
  } catch {
    return { error: "Você não tem permissão para editar lançamentos." };
  }

  const parsed = updateEntrySchema.safeParse({
    entry_id: formData.get("entry_id"),
    description: formData.get("description"),
    counterparty_id: formData.get("counterparty_id") ?? "",
    category_id: formData.get("category_id"),
    subcategory_id: formData.get("subcategory_id") ?? "",
    cost_center_id: formData.get("cost_center_id") ?? "",
    bank_account_id: formData.get("bank_account_id") ?? "",
    payment_method_id: formData.get("payment_method_id") ?? "",
    original_amount: formData.get("original_amount"),
    issue_date: formData.get("issue_date") ?? "",
    competence_date: formData.get("competence_date") ?? "",
    due_date: formData.get("due_date"),
    document_number: formData.get("document_number") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, userId } = await getOrgIdAndUser();
  const data = parsed.data;

  const { data: current } = await supabase
    .from("financial_entries")
    .select("status, type, description, original_amount, due_date")
    .eq("id", data.entry_id)
    .single();

  if (!current) {
    return { error: "Lançamento não encontrado." };
  }

  const { error } = await supabase
    .from("financial_entries")
    .update({
      description: data.description,
      counterparty_id: emptyToNull(data.counterparty_id),
      category_id: data.category_id,
      subcategory_id: emptyToNull(data.subcategory_id),
      cost_center_id: emptyToNull(data.cost_center_id),
      bank_account_id: emptyToNull(data.bank_account_id),
      payment_method_id: emptyToNull(data.payment_method_id),
      original_amount: data.original_amount,
      issue_date: emptyToNull(data.issue_date),
      competence_date: emptyToNull(data.competence_date),
      due_date: data.due_date,
      document_number: emptyToNull(data.document_number),
      notes: emptyToNull(data.notes),
      updated_by: userId,
    })
    .eq("id", data.entry_id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  await logAudit({
    action: "editar",
    entity: "financial_entries",
    entityId: data.entry_id,
    previousValue: {
      descricao: current.description,
      valor: current.original_amount,
      vencimento: current.due_date,
    },
    newValue: { descricao: data.description, valor: data.original_amount, vencimento: data.due_date },
  });

  revalidatePath(current.type === "despesa" ? "/contas-a-pagar" : "/contas-a-receber");
  revalidatePath(`${current.type === "despesa" ? "/contas-a-pagar" : "/contas-a-receber"}/${data.entry_id}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Liquidar (pagar/receber) um lançamento — integral ou parcial, com encargos.
// ---------------------------------------------------------------------------
export async function settleEntryFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // formData.get() retorna null (não undefined) para "notes" — este
  // formulário nunca teve um campo de observações. z.optional() só aceita
  // undefined, não null — sem o "?? ''", isso quebra a validação com o
  // erro genérico "Invalid input" (mesma causa-raiz já corrigida em vários
  // outros formulários).
  const parsed = settleSchema.safeParse({
    entry_id: formData.get("entry_id"),
    bank_account_id: formData.get("bank_account_id"),
    settlement_date: formData.get("settlement_date"),
    payment_method_id: formData.get("payment_method_id") ?? "",
    notes: formData.get("notes") ?? "",
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
// Editar uma liquidação já registrada (valor, data, conta, encargos etc.).
//
// Diferente de editar o lançamento (que só muda o "valor esperado" e não
// reflete em relatórios de regime de caixa), editar a liquidação corrige o
// que de fato foi registrado como pago/recebido — por isso reflete em
// tudo que usa regime de caixa: Fluxo de Caixa Realizado, DRE em regime de
// caixa, Dashboard. É a forma correta de corrigir um valor errado num
// lançamento já liquidado, sem precisar estornar e liquidar de novo.
//
// Só é permitido em liquidações ainda válidas (não estornadas).
// ---------------------------------------------------------------------------
export async function updateSettlementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("cancelar_lancamentos");
  } catch {
    return { error: "Você não tem permissão para editar liquidações." };
  }

  const parsed = updateSettlementSchema.safeParse({
    settlement_id: formData.get("settlement_id"),
    bank_account_id: formData.get("bank_account_id"),
    settlement_date: formData.get("settlement_date"),
    amount: formData.get("amount"),
    payment_method_id: formData.get("payment_method_id") ?? "",
    interest: formData.get("interest") || "0",
    penalty: formData.get("penalty") || "0",
    discount: formData.get("discount") || "0",
    addition: formData.get("addition") || "0",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, userId } = await getOrgIdAndUser();
  const data = parsed.data;

  const { data: current } = await supabase
    .from("financial_settlements")
    .select("status, amount, settlement_date, entry_id, financial_entries(type, status)")
    .eq("id", data.settlement_id)
    .single();

  if (!current) {
    return { error: "Liquidação não encontrada." };
  }
  if (current.status !== "valido") {
    return { error: "Esta liquidação está estornada e não pode ser editada — desfaça o estorno primeiro, se precisar." };
  }

  const { error } = await supabase
    .from("financial_settlements")
    .update({
      bank_account_id: data.bank_account_id,
      settlement_date: data.settlement_date,
      amount: data.amount,
      payment_method_id: emptyToNull(data.payment_method_id),
      interest: data.interest ?? 0,
      penalty: data.penalty ?? 0,
      discount: data.discount ?? 0,
      addition: data.addition ?? 0,
      notes: emptyToNull(data.notes),
    })
    .eq("id", data.settlement_id);

  if (error) {
    return { error: "Não foi possível salvar as alterações da liquidação." };
  }

  const entryInfo = current.financial_entries as unknown as { type: string; status: string } | null;

  // Quando o lançamento já está totalmente fechado (pago/recebido), editar
  // uma liquidação também corrige o valor do lançamento — para refletir
  // certo na DRE em regime de competência, não só no caixa (mesma lógica
  // já aplicada em "considerar totalmente liquidado" na conciliação).
  //
  // Enquanto o lançamento ainda estiver parcialmente pago/recebido (ou em
  // qualquer outro status não fechado), o valor do lançamento NÃO é
  // tocado — ele continua representando o total esperado, e o restante
  // ainda em aberto continua fazendo sentido.
  if (entryInfo && (entryInfo.status === "pago" || entryInfo.status === "recebido")) {
    const { data: validSettlements } = await supabase
      .from("financial_settlements")
      .select("amount")
      .eq("entry_id", current.entry_id)
      .eq("status", "valido");

    const settledSum = (validSettlements ?? []).reduce((sum, s) => sum + Number(s.amount), 0);

    await supabase
      .from("financial_entries")
      .update({ original_amount: settledSum, updated_by: userId })
      .eq("id", current.entry_id);
  }

  await logAudit({
    action: "editar",
    entity: "financial_settlements",
    entityId: data.settlement_id,
    previousValue: { valor: current.amount, data: current.settlement_date },
    newValue: { valor: data.amount, data: data.settlement_date },
  });

  const type = entryInfo?.type;
  revalidatePath("/contas-a-pagar");
  revalidatePath("/contas-a-receber");
  if (current.entry_id) revalidatePath(`${type === "despesa" ? "/contas-a-pagar" : "/contas-a-receber"}/${current.entry_id}`);
  revalidatePath("/fluxo-de-caixa/realizado");
  revalidatePath("/dre");
  revalidatePath("/dashboard");
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

  // formData.get() retorna null (não undefined) para campos que não
  // existem no formulário — o formulário de parcelamento não tem campos de
  // subcategoria/forma de pagamento, e campos opcionais com z.optional()
  // só aceitam undefined, não null. Sem o "?? ''" abaixo, isso quebra a
  // validação com o erro genérico "Invalid input" (mesma causa-raiz do
  // ajuste já feito em relatórios na Fase 11).
  const parsed = installmentPlanSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    counterparty_id: formData.get("counterparty_id") ?? "",
    category_id: formData.get("category_id"),
    subcategory_id: formData.get("subcategory_id") ?? "",
    cost_center_id: formData.get("cost_center_id") ?? "",
    bank_account_id: formData.get("bank_account_id") ?? "",
    payment_method_id: formData.get("payment_method_id") ?? "",
    total_amount: formData.get("total_amount"),
    installments_count: formData.get("installments_count"),
    first_due_date: formData.get("first_due_date"),
    recognition_strategy: formData.get("recognition_strategy"),
    competence_date: formData.get("competence_date") ?? "",
    document_number: formData.get("document_number") ?? "",
    notes: formData.get("notes") ?? "",
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

  // Mesma causa-raiz do ajuste em relatórios (Fase 11) e do parcelamento
  // acima: formData.get() retorna null para campos ausentes do formulário
  // (aqui, subcategoria e forma de pagamento), o que quebra campos
  // opcionais do Zod (que só aceitam undefined, não null) com o erro
  // genérico "Invalid input".
  const parsed = recurringRuleSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    counterparty_id: formData.get("counterparty_id") ?? "",
    category_id: formData.get("category_id"),
    subcategory_id: formData.get("subcategory_id") ?? "",
    cost_center_id: formData.get("cost_center_id") ?? "",
    bank_account_id: formData.get("bank_account_id") ?? "",
    payment_method_id: formData.get("payment_method_id") ?? "",
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    interval_count: formData.get("interval_count") || "1",
    end_date: formData.get("end_date") ?? "",
    start_date: formData.get("start_date"),
    max_occurrences: formData.get("max_occurrences") || "",
    adjust_business_day: formData.get("adjust_business_day") === "on",
    competence_anchor_date: formData.get("competence_anchor_date") ?? "",
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

  const { data: occurrencesGenerated, error: generateError } = await supabase.rpc("generate_recurring_instances", {
    p_rule_id: rule.id,
    p_months_ahead: 12,
  });

  if (generateError) {
    // A regra já foi criada — não desfazemos isso — mas o operador precisa
    // saber que nenhum lançamento foi gerado ainda, em vez de simplesmente
    // não encontrá-los em Contas a pagar/receber sem explicação.
    await logAudit({
      action: "criar",
      entity: "recurring_rules",
      entityId: rule.id,
      metadata: { erro_ao_gerar_ocorrencias: generateError.message },
    });
    revalidatePath("/recorrencias");
    redirect(`/recorrencias?erro_geracao=${encodeURIComponent(rule.id)}`);
  }

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
      ocorrenciasGeradas: occurrencesGenerated ?? 0,
    },
  });

  // A recorrência já gera lançamentos reais na criação — sem revalidar
  // Contas a pagar/receber, quem for direto para lá pode ver a lista
  // desatualizada por causa do cache de navegação do Next.js.
  revalidatePath("/recorrencias");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/contas-a-receber");
  redirect("/recorrencias");
}

// ---------------------------------------------------------------------------
// Editar uma recorrência já existente.
//
// A edição atualiza a regra (recurring_rules) — vale para todas as
// ocorrências que ainda serão geradas dali em diante. Não é possível mudar
// a data inicial (start_date) depois de criada, pois isso desalinharia a
// cadência das ocorrências já geradas.
//
// Opcionalmente (quando "apply_to_pending" vem marcado), a mesma alteração
// também é aplicada às ocorrências já geradas mas ainda em aberto — nunca
// em ocorrências já pagas/recebidas, canceladas ou estornadas, seguindo a
// mesma regra usada na edição de um lançamento avulso. Isso evita ter que
// editar manualmente cada ocorrência pendente uma por uma quando, por
// exemplo, o valor do aluguel muda.
// ---------------------------------------------------------------------------
const RECURRING_PENDING_STATUSES = ["em_aberto", "agendado"];

export async function updateRecurringRuleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("criar_lancamentos");
  } catch {
    return { error: "Você não tem permissão para editar recorrências." };
  }

  const parsed = updateRecurringRuleSchema.safeParse({
    rule_id: formData.get("rule_id"),
    description: formData.get("description"),
    counterparty_id: formData.get("counterparty_id") ?? "",
    category_id: formData.get("category_id"),
    subcategory_id: formData.get("subcategory_id") ?? "",
    cost_center_id: formData.get("cost_center_id") ?? "",
    bank_account_id: formData.get("bank_account_id") ?? "",
    payment_method_id: formData.get("payment_method_id") ?? "",
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    interval_count: formData.get("interval_count") || "1",
    end_date: formData.get("end_date") ?? "",
    max_occurrences: formData.get("max_occurrences") || "",
    adjust_business_day: formData.get("adjust_business_day") === "on",
    competence_anchor_date: formData.get("competence_anchor_date") ?? "",
    apply_to_pending: formData.get("apply_to_pending") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, userId } = await getOrgIdAndUser();
  const data = parsed.data;

  const { data: rule } = await supabase
    .from("recurring_rules")
    .select("type, description, amount")
    .eq("id", data.rule_id)
    .single();

  if (!rule) {
    return { error: "Recorrência não encontrada." };
  }

  const updatePayload = {
    description: data.description,
    counterparty_id: emptyToNull(data.counterparty_id),
    category_id: data.category_id,
    subcategory_id: emptyToNull(data.subcategory_id),
    cost_center_id: emptyToNull(data.cost_center_id),
    bank_account_id: emptyToNull(data.bank_account_id),
    payment_method_id: emptyToNull(data.payment_method_id),
    amount: data.amount,
    frequency: data.frequency,
    interval_count: data.interval_count ?? 1,
    end_date: emptyToNull(data.end_date),
    max_occurrences: data.max_occurrences && data.max_occurrences !== "" ? Number(data.max_occurrences) : null,
    adjust_business_day: data.adjust_business_day ?? false,
    competence_anchor_date: emptyToNull(data.competence_anchor_date),
    updated_by: userId,
  };

  const { error } = await supabase.from("recurring_rules").update(updatePayload).eq("id", data.rule_id);

  if (error) {
    return { error: "Não foi possível salvar as alterações da recorrência." };
  }

  let updatedPendingCount = 0;
  if (data.apply_to_pending) {
    const { data: updatedEntries, error: pendingError } = await supabase
      .from("financial_entries")
      .update({
        description: data.description,
        counterparty_id: emptyToNull(data.counterparty_id),
        category_id: data.category_id,
        subcategory_id: emptyToNull(data.subcategory_id),
        cost_center_id: emptyToNull(data.cost_center_id),
        bank_account_id: emptyToNull(data.bank_account_id),
        payment_method_id: emptyToNull(data.payment_method_id),
        original_amount: data.amount,
        updated_by: userId,
      })
      .eq("recurring_rule_id", data.rule_id)
      .in("status", RECURRING_PENDING_STATUSES)
      .select("id");

    if (pendingError) {
      return {
        error:
          "A recorrência foi atualizada, mas não foi possível aplicar a alteração às ocorrências pendentes. Edite-as manualmente se precisar.",
      };
    }
    updatedPendingCount = updatedEntries?.length ?? 0;
  }

  await logAudit({
    action: "editar",
    entity: "recurring_rules",
    entityId: data.rule_id,
    previousValue: { descricao: rule.description, valor: rule.amount },
    newValue: { descricao: data.description, valor: data.amount, ocorrenciasPendentesAtualizadas: updatedPendingCount },
  });

  revalidatePath("/recorrencias");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/contas-a-receber");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Gerar mais ocorrências de uma recorrência já existente.
// ---------------------------------------------------------------------------
export async function generateMoreOccurrencesAction(ruleId: string) {
  const { supabase } = await getOrgIdAndUser();
  const { data: rule } = await supabase.from("recurring_rules").select("type").eq("id", ruleId).single();
  const { error } = await supabase.rpc("generate_recurring_instances", { p_rule_id: ruleId, p_months_ahead: 12 });
  if (error) {
    await logAudit({
      action: "gerar",
      entity: "recurring_rules",
      entityId: ruleId,
      metadata: { acao: "gerar ocorrências (+12 meses)", erro: error.message },
    });
    revalidatePath("/recorrencias");
    return { error: "Não foi possível gerar novas ocorrências. Tente novamente em instantes." };
  }
  await logAudit({ action: "gerar", entity: "recurring_rules", entityId: ruleId, metadata: { acao: "gerar ocorrências (+12 meses)" } });
  revalidatePath("/recorrencias");
  revalidatePath(rule?.type === "despesa" ? "/contas-a-pagar" : "/contas-a-receber");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Cancelar ocorrências de uma recorrência, por escopo.
// ---------------------------------------------------------------------------
export async function cancelRecurringFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // formData.get() retorna null (não undefined) para "from_entry_id" quando
  // o escopo escolhido é "toda" (o padrão) — o campo só existe no
  // formulário para os escopos "uma"/"futuras". Mesma causa-raiz já
  // corrigida em vários outros formulários.
  const parsed = cancelRecurringSchema.safeParse({
    rule_id: formData.get("rule_id"),
    scope: formData.get("scope"),
    from_entry_id: formData.get("from_entry_id") ?? "",
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
