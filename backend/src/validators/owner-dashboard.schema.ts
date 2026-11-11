import { z } from "zod";

function dateParts(value: string): [number, number, number] {
  return [
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)),
    Number(value.slice(8, 10)),
  ];
}

function isValidCalendarDate(value: string): boolean {
  const [year, month, day] = dateParts(value);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function daysBetweenDateKeys(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = dateParts(from);
  const [toYear, toMonth, toDay] = dateParts(to);

  return (
    Date.UTC(toYear, toMonth - 1, toDay) -
    Date.UTC(fromYear, fromMonth - 1, fromDay)
  ) / 86400000;
}

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD")
  .refine(isValidCalendarDate, "Invalid calendar date");

const timeKey = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm");

export const ownerDashboardQuerySchema = z.object({
  range: z.enum(["7d", "30d"]).default("7d"),
});

const appointmentStatus = z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]);

export const ownerScheduleQuerySchema = z.object({
  date: dateKey.optional(), // single day shortcut used by the owner UI (same as from=to=date)
  from: dateKey.optional(),
  to: dateKey.optional(),
  status: appointmentStatus.optional(),
  // Filters
  treatmentId: z.string().trim().min(1).max(128).optional(),
  patientId: z.string().trim().min(1).max(128).optional(),
  consultationType: z.enum(["IN_CLINIC", "VIDEO"]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUND_PENDING", "REFUND_FAILED", "REFUNDED"]).optional(),
  q: z.string().trim().min(1).max(100).optional(), // patient name / email / phone
  sort: z.enum(["asc", "desc"]).default("asc"),
  // "list" = paginated rows, "calendar" = every match in the range grouped by day (month/week grid)
  view: z.enum(["list", "calendar"]).default("list"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).superRefine((value, ctx) => {
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({ code: "custom", path: ["from"], message: "from must be on or before to" });
  }
  if (value.from && value.to) {
  const days = daysBetweenDateKeys(value.from, value.to);

  if (days > 90) {
    ctx.addIssue({
      code: "custom",
      path: ["to"],
      message: "Date range cannot exceed 91 calendar days",
    });
  }
}
});

export const workingHoursParamsSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
});

export const workingHoursBodySchema = z.object({
  startTime: timeKey,
  endTime: timeKey,
  breakStart: timeKey.nullable().optional(),
  breakEnd: timeKey.nullable().optional(),
  slotMinutes: z.coerce.number().int().min(5).max(120).default(30),
  isOff: z.boolean().default(false),
}).superRefine((value, ctx) => {
  const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  if (toMinutes(value.startTime) >= toMinutes(value.endTime)) {
    ctx.addIssue({ code: "custom", path: ["endTime"], message: "endTime must be after startTime" });
  }
  const hasBreakStart = value.breakStart != null;
  const hasBreakEnd = value.breakEnd != null;
  if (hasBreakStart !== hasBreakEnd) {
    ctx.addIssue({ code: "custom", path: ["breakEnd"], message: "breakStart and breakEnd must both be set or both be null" });
  }
  if (hasBreakStart && hasBreakEnd) {
    const start = toMinutes(value.startTime); const end = toMinutes(value.endTime);
    const breakStart = toMinutes(value.breakStart!); const breakEnd = toMinutes(value.breakEnd!);
    if (!(start <= breakStart && breakStart < breakEnd && breakEnd <= end)) {
      ctx.addIssue({ code: "custom", path: ["breakStart"], message: "Break must be inside working hours" });
    }
  }
});

export const blockedDatesQuerySchema = z.object({
  from: dateKey.optional(),
  to: dateKey.optional(),
}).superRefine((value, ctx) => {
  if (value.from && value.to && value.from > value.to) ctx.addIssue({ code: "custom", path: ["from"], message: "from must be on or before to" });
  if (value.from && value.to) {
  if (daysBetweenDateKeys(value.from, value.to) > 365) {
    ctx.addIssue({
      code: "custom",
      path: ["to"],
      message: "Date range cannot exceed 366 calendar days",
    });
  }
}
});

export const createBlockedDateSchema = z.object({
  date: dateKey,
  reason: z.string().trim().max(300).optional().nullable(),
});

export const blockedDateParamsSchema = z.object({ date: dateKey });

export const ownerPatientsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ownerRecordQuerySchema = z.object({
  patientId: z.string().trim().min(1).max(128).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createOwnerRecordSchema = z.object({
  patientId: z.string().trim().min(1).max(128),
  appointmentId: z.string().trim().min(1).max(128).optional().nullable(),
  toothNo: z.string().trim().max(32).optional().nullable(),
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(2).max(5000),
  date: z.coerce.date().optional(),
  prescriptions: z.array(z.object({
    medicine: z.string().trim().min(1).max(200),
    instructions: z.string().trim().min(1).max(2000),
  })).max(20).optional().default([]),
}).superRefine((value, ctx) => {
  if (value.date && value.date.getTime() > Date.now() + 5 * 60_000) {
    ctx.addIssue({ code: "custom", path: ["date"], message: "Record date cannot be in the future" });
  }
});

export type OwnerDashboardQuery = z.infer<typeof ownerDashboardQuerySchema>;
export type OwnerScheduleQuery = z.infer<typeof ownerScheduleQuerySchema>;
export type WorkingHoursBody = z.infer<typeof workingHoursBodySchema>;
export type BlockedDatesQuery = z.infer<typeof blockedDatesQuerySchema>;
export type CreateBlockedDateBody = z.infer<typeof createBlockedDateSchema>;
export type OwnerRecordQuery = z.infer<typeof ownerRecordQuerySchema>;
export type OwnerPatientsQuery = z.infer<typeof ownerPatientsQuerySchema>;
export type CreateOwnerRecordBody = z.infer<typeof createOwnerRecordSchema>;

export const ownerAppointmentParamsSchema = z.object({ id: z.string().trim().min(1).max(128) }).strict();

/** The dentist can only close out a visit: completed or no-show. Cancelling has its own endpoint (refund + emails). */
export const ownerAppointmentStatusSchema = z.object({ status: z.enum(["COMPLETED", "NO_SHOW"]) }).strict();

export const ownerCancelSchema = z.object({ reason: z.string().trim().max(300).optional() }).strict();

export const ownerRecordParamsSchema = z.object({ recordId: z.string().trim().min(1).max(128) }).strict();
