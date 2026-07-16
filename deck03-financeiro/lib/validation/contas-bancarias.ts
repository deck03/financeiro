import { z } from "zod";

export const bankAccountSchema = z.object({
  display_name: z.string().min(1, "Informe o nome de exibição."),
  bank_name: z.string().optional().or(z.literal("")),
  agency: z.string().optional().or(z.literal("")),
  account_number: z.string().optional().or(z.literal("")),
  account_type: z.enum([
    "conta_corrente",
    "conta_pagamento",
    "poupanca",
    "caixa",
    "investimento_liquidez",
    "outro",
  ]),
  ownership: z.enum(["deck03", "pessoa_fisica", "outro"]),
  holder_name: z.string().optional().or(z.literal("")),
  document_number: z.string().optional().or(z.literal("")),
  initial_balance: z.coerce.number(),
  initial_balance_date: z.string().min(1, "Informe a data do saldo inicial."),
  minimum_balance: z
    .union([z.coerce.number(), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  consider_in_available_balance: z.coerce.boolean().optional(),
  consider_in_business_dashboard: z.coerce.boolean().optional(),
  allow_ofx_import: z.coerce.boolean().optional(),
});
