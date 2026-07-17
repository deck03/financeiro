import { z } from "zod";

export const entrySchema = z.object({
  type: z.enum(["receita", "despesa"]),
  description: z.string().min(1, "Informe a descrição."),
  counterparty_id: z.string().uuid().optional().or(z.literal("")),
  category_id: z.string().uuid("Selecione a categoria."),
  subcategory_id: z.string().uuid().optional().or(z.literal("")),
  cost_center_id: z.string().uuid().optional().or(z.literal("")),
  bank_account_id: z.string().uuid().optional().or(z.literal("")),
  payment_method_id: z.string().uuid().optional().or(z.literal("")),
  original_amount: z.coerce.number().positive("Informe um valor maior que zero."),
  issue_date: z.string().optional().or(z.literal("")),
  competence_date: z.string().optional().or(z.literal("")),
  due_date: z.string().min(1, "Informe a data de vencimento."),
  document_number: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  already_settled: z.coerce.boolean().optional(),
  settlement_date: z.string().optional().or(z.literal("")),
  settlement_bank_account_id: z.string().uuid().optional().or(z.literal("")),
});

export const settleSchema = z.object({
  entry_id: z.string().uuid(),
  bank_account_id: z.string().uuid("Selecione a conta bancária."),
  settlement_date: z.string().min(1, "Informe a data."),
  payment_method_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  amount: z.string().optional(),
  interest: z.coerce.number().min(0).optional(),
  penalty: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
  addition: z.coerce.number().min(0).optional(),
});

export const reverseSettlementSchema = z.object({
  settlement_id: z.string().uuid(),
  reason: z.string().optional().or(z.literal("")),
});

export const installmentPlanSchema = z.object({
  type: z.enum(["receita", "despesa"]),
  description: z.string().min(1, "Informe a descrição."),
  counterparty_id: z.string().uuid().optional().or(z.literal("")),
  category_id: z.string().uuid("Selecione a categoria."),
  subcategory_id: z.string().uuid().optional().or(z.literal("")),
  cost_center_id: z.string().uuid().optional().or(z.literal("")),
  bank_account_id: z.string().uuid().optional().or(z.literal("")),
  payment_method_id: z.string().uuid().optional().or(z.literal("")),
  total_amount: z.coerce.number().positive("Informe um valor maior que zero."),
  installments_count: z.coerce.number().int().min(2, "Um parcelamento precisa de pelo menos 2 parcelas."),
  first_due_date: z.string().min(1, "Informe a data do primeiro vencimento."),
  recognition_strategy: z.enum(["competencia_original", "por_parcela", "conforme_pagamento"]),
  document_number: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const recurringRuleSchema = z.object({
  type: z.enum(["receita", "despesa"]),
  description: z.string().min(1, "Informe a descrição."),
  counterparty_id: z.string().uuid().optional().or(z.literal("")),
  category_id: z.string().uuid("Selecione a categoria."),
  subcategory_id: z.string().uuid().optional().or(z.literal("")),
  cost_center_id: z.string().uuid().optional().or(z.literal("")),
  bank_account_id: z.string().uuid().optional().or(z.literal("")),
  payment_method_id: z.string().uuid().optional().or(z.literal("")),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  frequency: z.enum(["semanal", "mensal", "bimestral", "trimestral", "semestral", "anual"]),
  interval_count: z.coerce.number().int().min(1).default(1),
  start_date: z.string().min(1, "Informe a data inicial."),
  end_date: z.string().optional().or(z.literal("")),
  max_occurrences: z.string().optional(),
  adjust_business_day: z.coerce.boolean().optional(),
});

export const cancelRecurringSchema = z.object({
  rule_id: z.string().uuid(),
  scope: z.enum(["uma", "futuras", "toda"]),
  from_entry_id: z.string().uuid().optional().or(z.literal("")),
});

export const cancelSchema = z.object({
  entry_id: z.string().uuid(),
  reason: z.string().optional().or(z.literal("")),
});
