import { z } from "zod";

export const reviewsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const submitReviewSchema = z.object({
  appointmentId: z.string().trim().min(1).max(128),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5, "Please write at least a few words").max(1000),
}).strict();

export const reviewIdParamsSchema = z.object({ id: z.string().trim().min(1).max(128) }).strict();
export const moderateReviewSchema = z.object({ approved: z.boolean() }).strict();
export const ownerReviewsQuery = z.object({
  approved: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});
