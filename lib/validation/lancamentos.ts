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
});

export const cancelSchema = z.object({
  entry_id: z.string().uuid(),
  reason: z.string().optional().or(z.literal("")),
});
