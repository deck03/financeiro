import { z } from "zod";

export const organizationSettingsSchema = z.object({
  display_name: z.string().min(1, "Informe o nome de exibição."),
  document_number: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});
