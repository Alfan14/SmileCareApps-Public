import { z } from "zod";

export const patientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const patientAppointmentsQuerySchema = patientListQuerySchema.extend({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
});

export const patientIdParamsSchema = z.object({
  invoiceId: z.string().trim().min(1).max(128),
});

export type PatientListQuery = z.infer<typeof patientListQuerySchema>;
export type PatientAppointmentsQuery = z.infer<typeof patientAppointmentsQuerySchema>;

export const recordIdParamsSchema = z.object({ recordId: z.string().trim().min(1).max(128) });
