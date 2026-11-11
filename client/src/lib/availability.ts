import { z } from "zod";
import type { Availability } from "../types/api";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const day = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOff: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
  breakStart: z.string(), // "" means no break
  breakEnd: z.string(),
  slotMinutes: z.number({ error: "Enter a number" }).int("Whole minutes only").min(10, "At least 10 minutes").max(120, "At most 120 minutes"),
});

export const availabilitySchema = z
  .object({
    hours: z.array(day).length(7),
    blocked: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"), reason: z.string().max(100, "Keep it under 100 characters") })),
  })
  .superRefine((v, ctx) => {
    v.hours.forEach((d, i) => {
      if (d.isOff) return; // closed days need no times
      const issue = (field: string, message: string) => ctx.addIssue({ code: "custom", message, path: ["hours", i, field] });

      const startOk = TIME.test(d.startTime);
      const endOk = TIME.test(d.endTime);
      if (!startOk) issue("startTime", "Use a time like 09:00");
      if (!endOk) issue("endTime", "Use a time like 19:00");
      if (startOk && endOk && d.startTime >= d.endTime) issue("endTime", "Closing time must be after opening time");

      const hasStart = d.breakStart !== "";
      const hasEnd = d.breakEnd !== "";
      if (hasStart !== hasEnd) {
        issue(hasStart ? "breakEnd" : "breakStart", "Set both break times, or clear both");
      } else if (hasStart && hasEnd) {
        const bsOk = TIME.test(d.breakStart);
        const beOk = TIME.test(d.breakEnd);
        if (!bsOk) issue("breakStart", "Use a time like 13:00");
        if (!beOk) issue("breakEnd", "Use a time like 14:00");
        if (bsOk && beOk) {
          if (d.breakStart >= d.breakEnd) issue("breakEnd", "Break end must be after break start");
          else if (startOk && endOk && (d.breakStart < d.startTime || d.breakEnd > d.endTime)) issue("breakStart", "The break must be inside opening hours");
        }
      }
    });

    const seen = new Set<string>();
    v.blocked.forEach((b, i) => {
      if (seen.has(b.date)) ctx.addIssue({ code: "custom", message: "This date is already blocked", path: ["blocked", i, "date"] });
      seen.add(b.date);
    });
  });

export type AvailabilityForm = z.infer<typeof availabilitySchema>;

export const toForm = (a: Availability): AvailabilityForm => ({
  hours: a.workingHours.map((d) => ({ ...d, breakStart: d.breakStart ?? "", breakEnd: d.breakEnd ?? "" })),
  blocked: a.blockedDates.map((b) => ({ ...b })),
});

export const toPayload = (f: AvailabilityForm): Availability => ({
  workingHours: f.hours.map((d) => ({ ...d, breakStart: d.breakStart || null, breakEnd: d.breakEnd || null })),
  blockedDates: [...f.blocked].sort((a, b) => a.date.localeCompare(b.date)).map((b) => ({ date: b.date, reason: b.reason.trim() })),
});
