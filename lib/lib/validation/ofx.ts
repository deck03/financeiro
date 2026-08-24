import { z } from "zod";

export const ofxTransactionSchema = z.object({
  fitid: z.string().nullable(),
  date: z.string().min(1),
  amount: z.number(),
  description: z.string(),
});

export const previewOfxSchema = z.object({
  bank_account_id: z.string().uuid("Selecione a conta bancária."),
  transactions: z.array(ofxTransactionSchema).min(1, "O arquivo não contém transações."),
});

export const confirmOfxSchema = z.object({
  bank_account_id: z.string().uuid(),
  file_name: z.string().min(1),
  transactions: z.array(ofxTransactionSchema),
});

export const reconcileExistingSchema = z.object({
  bank_transaction_id: z.string().uuid(),
  entry_id: z.string().uuid("Selecione o lançamento."),
  amount: z.coerce.number().positive().optional(),
  // Quando o valor não bate com o saldo restante do lançamento, o operador
  // escolhe: liquidação parcial (padrão — grava exatamente o valor
  // informado, o restante fica em aberto) ou considerar totalmente
  // liquidado (fecha o lançamento mesmo com valor diferente — comum em
  // recorrências cujo valor varia um pouco a cada mês).
  mark_as_fully_settled: z.coerce.boolean().optional(),
});

export const reconcileNewEntrySchema = z.object({
  bank_transaction_id: z.string().uuid(),
  category_id: z.string().uuid("Selecione a categoria."),
  description: z.string().optional().or(z.literal("")),
  counterparty_id: z.string().uuid().optional().or(z.literal("")),
  subcategory_id: z.string().uuid().optional().or(z.literal("")),
  cost_center_id: z.string().uuid().optional().or(z.literal("")),
  payment_method_id: z.string().uuid().optional().or(z.literal("")),
  document_number: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  competence_date: z.string().optional().or(z.literal("")),
});
