import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errors";

/** Clinic timezone in the current project data: Asia/Kolkata (UTC+05:30). */
const CLINIC_OFFSET_MINUTES = 330;
const CLINIC_OFFSET = "+05:30";
const LEAD_MINUTES = 60;

export type Slot = { start: string; end: string; label: string };

export const addMin = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60_000);

/** Convert a clinic-local YYYY-MM-DD value to its UTC instant at clinic midnight. */
export function atClinicMidnight(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpError(422, "VALIDATION_ERROR", "date must be YYYY-MM-DD");
  }
  const midnight = new Date(`${date}T00:00:00${CLINIC_OFFSET}`);
  if (Number.isNaN(midnight.getTime())) {
    throw new HttpError(422, "VALIDATION_ERROR", "date must be a real calendar date in YYYY-MM-DD format");
  }
  const roundTrip = new Date(midnight.getTime() + CLINIC_OFFSET_MINUTES * 60_000)
    .toISOString()
    .slice(0, 10);
  if (roundTrip !== date) {
    throw new HttpError(422, "VALIDATION_ERROR", "date must be a real calendar date in YYYY-MM-DD format");
  }
  return midnight;
}

/** Resolve the clinic-local date for an instant. */
export function clinicDateForInstant(instant: Date): string {
  return new Date(instant.getTime() + CLINIC_OFFSET_MINUTES * 60_000)
    .toISOString()
    .slice(0, 10);
}

function toMinutes(hhmm: string): number {
  const [hoursText, minutesText] = hhmm.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  return hours * 60 + minutes;
}

function formatClinicTime(instant: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(instant);
}

/**
 * Return currently bookable slots for a clinic-local date and active treatment.
 * Confirmed appointments and unexpired PENDING holds block overlapping intervals.
 */
export async function getFreeSlots(
  date: string,
  treatmentId: string,
  now: Date = new Date(),
  excludeAppointmentId?: string,
): Promise<Slot[]> {
  const dayStart = atClinicMidnight(date);
  if (!treatmentId?.trim()) {
    throw new HttpError(422, "VALIDATION_ERROR", "treatmentId is required");
  }
  const dayEnd = addMin(dayStart, 24 * 60);

  const treatment = await prisma.treatment.findFirst({
    where: { id: treatmentId, active: true },
    select: { id: true, durationMin: true },
  });
  if (!treatment) throw new HttpError(404, "NOT_FOUND", "Treatment not found");

  // At noon clinic time, UTC weekday equals the same calendar weekday in this fixed-offset zone.
  const weekday = new Date(`${date}T12:00:00${CLINIC_OFFSET}`).getUTCDay();
  const [workingHours, blockedDate] = await Promise.all([
    prisma.workingHours.findUnique({ where: { dayOfWeek: weekday } }),
    prisma.blockedDate.findUnique({ where: { date: dayStart } }),
  ]);

  if (!workingHours || workingHours.isOff || blockedDate) return [];

  const busyAppointments = await prisma.appointment.findMany({
    where: {
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING", holdExpiresAt: { gt: now } },
      ],
    },
    select: { startTime: true, endTime: true },
  });

  const firstAllowedStart = addMin(now, LEAD_MINUTES);
  const opensAt = toMinutes(workingHours.startTime);
  const closesAt = toMinutes(workingHours.endTime);
  const breakStart = workingHours.breakStart ? toMinutes(workingHours.breakStart) : null;
  const breakEnd = workingHours.breakEnd ? toMinutes(workingHours.breakEnd) : null;
  const slots: Slot[] = [];

  for (
    let minuteOfDay = opensAt;
    minuteOfDay + treatment.durationMin <= closesAt;
    minuteOfDay += workingHours.slotMinutes
  ) {
    const endMinuteOfDay = minuteOfDay + treatment.durationMin;
    if (
      breakStart !== null &&
      breakEnd !== null &&
      minuteOfDay < breakEnd &&
      endMinuteOfDay > breakStart
    ) continue;

    const start = addMin(dayStart, minuteOfDay);
    const end = addMin(dayStart, endMinuteOfDay);
    if (start < firstAllowedStart) continue;
    const overlapsBooking = busyAppointments.some(
      (booking) => start < booking.endTime && end > booking.startTime,
    );
    if (overlapsBooking) continue;

    slots.push({ start: start.toISOString(), end: end.toISOString(), label: formatClinicTime(start) });
  }

  return slots;
}
