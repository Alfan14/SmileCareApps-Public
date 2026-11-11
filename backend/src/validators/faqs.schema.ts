import { z } from "zod";

export const faqsQuery = z.object({
  category: z.string().trim().min(1).max(50).optional(),
});
