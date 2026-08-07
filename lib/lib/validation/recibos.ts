import { z } from "zod";

export const cancelReceiptSchema = z.object({
  receipt_id: z.string().uuid(),
  reason: z.string().optional().or(z.literal("")),
});
