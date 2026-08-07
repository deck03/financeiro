import { z } from "zod";

export const TRANSFER_CLASSIFICATIONS = [
  "transferencia_interna",
  "distribuicao_lucros",
  "retirada_socio",
  "adiantamento_socio",
  "reembolso_socio",
  "despesa_pessoal",
  "aporte_socio",
  "devolucao_adiantamento",
] as const;

export const transferSchema = z
  .object({
    from_bank_account_id: z.string().uuid("Selecione a conta de origem."),
    to_bank_account_id: z.string().uuid("Selecione a conta de destino."),
    amount: z.coerce.number().positive("Informe um valor maior que zero."),
    transfer_date: z.string().min(1, "Informe a data."),
    classification: z.enum(TRANSFER_CLASSIFICATIONS),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.from_bank_account_id !== data.to_bank_account_id, {
    message: "A conta de origem e a conta de destino não podem ser a mesma.",
    path: ["to_bank_account_id"],
  });

export const balanceSnapshotSchema = z.object({
  bank_account_id: z.string().uuid("Selecione a conta bancária."),
  snapshot_date: z.string().min(1, "Informe a data."),
  informed_balance: z.coerce.number(),
  notes: z.string().optional().or(z.literal("")),
});
