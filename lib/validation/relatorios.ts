import { z } from "zod";

export const reportConfigSchema = z.object({
  report_type: z.enum(["semanal", "mensal"]),
  enabled: z.coerce.boolean().optional(),
  recipients: z.string().optional().or(z.literal("")),
  day_of_week: z.string().optional().or(z.literal("")),
  day_of_month: z.string().optional().or(z.literal("")),
  send_hour: z.coerce.number().int().min(0).max(23),
});

export function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
