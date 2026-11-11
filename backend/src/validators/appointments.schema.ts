import { z } from "zod";

const isoDateTimeWithOffset = z.string().refine((value) => {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
}, "startTime must be an ISO 8601 datetime with timezone, such as 2026-11-01T10:00:00+05:30");

export const createAppointmentSchema = z.object({
  treatmentId: z.string().trim().min(1).max(100),
  startTime: isoDateTimeWithOffset,
  consultationType: z.enum(["IN_CLINIC", "VIDEO"]).default("IN_CLINIC"),
  isNewPatient: z.boolean().default(false),
}).strict();

export type CreateAppointmentBody = z.infer<typeof createAppointmentSchema>;

export const appointmentIdParamsSchema = z.object({ id: z.string().trim().min(1).max(128) }).strict();

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(300).optional(),
}).strict();

export const rescheduleAppointmentSchema = z.object({ startTime: isoDateTimeWithOffset }).strict();
