import { z } from "zod";

const dateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const instant = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(instant.getTime())) return false;
  return new Date(instant.getTime() + 330 * 60_000).toISOString().slice(0, 10) === value;
}, "date must be a real calendar date in YYYY-MM-DD format");

export const slotsQuerySchema = z.object({
  date: dateSchema,
  treatmentId: z.string().trim().min(1).max(100),
}).strict();
