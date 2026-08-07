import { z } from "zod";

export const COUNTERPARTY_TYPES = [
  "locatario",
  "fornecedor",
  "prestador",
  "funcionario",
  "agregador",
  "socio",
  "cliente_eventual",
  "outro",
] as const;

export const counterpartySchema = z.object({
  name: z.string().min(1, "Informe o nome ou razão social."),
  trade_name: z.string().optional().or(z.literal("")),
  document_number: z.string().optional().or(z.literal("")),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  types: z.array(z.enum(COUNTERPARTY_TYPES)).min(1, "Selecione ao menos um tipo."),
  notes: z.string().optional().or(z.literal("")),
});
