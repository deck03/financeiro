import { z } from "zod";

export const costCenterSchema = z.object({
  name: z.string().min(1, "Informe o nome do centro de custo."),
  code: z.string().optional().or(z.literal("")),
  is_default: z.coerce.boolean().optional(),
});
