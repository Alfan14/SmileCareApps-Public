import type { OwnerAppointment, OwnerPatient, OwnerStats, Availability, BlockedDate, WorkingDay } from "../types/api";
import { clinicDateOf } from "./dates";
import { normalizeAppointment } from "./normalize";
import { isObj, itemOf, listOf, num, str, sub } from "./raw";
import type { Raw } from "./raw";

// Same idea as normalize.ts: accept wrapped or bare answers and flat or nested fields.

export function normalizeOwnerAppointment(raw: Raw): OwnerAppointment | null {
  const base = normalizeAppointment(raw);
  if (!base) return null;
  const patient = sub(raw, "patient");
  return {
    ...base,
    patientId: str(patient.id) ?? str(raw.patientId),
    patientName: str(patient.name) ?? str(raw.patientName) ?? "Patient",
    patientPhone: str(patient.phone) ?? str(raw.patientPhone),
    patientEmail: str(patient.email) ?? str(raw.patientEmail),
    isNewPatient: raw.isNewPatient === true,
  };
}

export const ownerAppointmentsFrom = (payload: unknown) =>
  listOf(payload, "appointments").map(normalizeOwnerAppointment).filter((x): x is OwnerAppointment => x !== null);

export function normalizeOwnerPatient(raw: Raw): OwnerPatient | null {
  const id = str(raw.id);
  if (!id) return null;
  return {
    id,
    name: str(raw.name) ?? "Patient",
    email: str(raw.email) ?? "",
    phone: str(raw.phone),
    appointmentCount: num(raw.appointmentCount) ?? num(sub(raw, "_count").appointments),
    lastVisit: str(raw.lastVisit),
  };
}

export const ownerPatientsFrom = (payload: unknown) =>
  listOf(payload, "patients").map(normalizeOwnerPatient).filter((x): x is OwnerPatient => x !== null);

export function statsFrom(payload: unknown): OwnerStats {
  const raw = isObj(payload) ? payload : {};
  const summary = sub(raw, "summary");
  const charts = sub(raw, "charts");

  return {
    timezone: str(raw.timezone) ?? "",
    range: str(raw.range) ?? "",

    summary: {
      totalPatients: num(summary.totalPatients),
      appointmentsToday: num(summary.appointmentsToday),
      pendingAppointments: num(summary.pendingAppointments),
      completedThisMonth: num(summary.completedThisMonth),
      revenuePaiseThisMonth: num(summary.revenuePaiseThisMonth),
      paidTransactionsThisMonth: num(summary.paidTransactionsThisMonth),
      currency: str(summary.currency) ?? "inr",
    },

    bookingsByDay: listOf(charts, "bookingsByDay").flatMap((item) => {
      const date = str(item.date);
      const count = num(item.count);

      return date && count !== null ? [{ date, count }] : [];
    }),

    revenueByDay: listOf(charts, "revenueByDay").flatMap((item) => {
      const date = str(item.date);
      const revenuePaise = num(item.revenuePaise);

      return date && revenuePaise !== null
        ? [{
            date,
            revenuePaise,
            currency: str(item.currency) ?? str(summary.currency) ?? "inr",
          }]
        : [];
    }),

    appointmentsByStatus: listOf(charts, "appointmentsByStatus").flatMap((item) => {
      const status = str(item.status);
      const count = num(item.count);

      return status && count !== null
        ? [{ name: status, count }]
        : [];
    }),

    upcomingSchedule: listOf(raw, "upcomingSchedule")
      .map(normalizeOwnerAppointment)
      .filter((item): item is OwnerAppointment => item !== null),
  };
}

// ---- availability ----
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
/** Monday first, Sunday last, as people read a week. */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const defaultDay = (dayOfWeek: number): WorkingDay => ({
  dayOfWeek,
  isOff: dayOfWeek === 0,
  startTime: "09:00",
  endTime: "19:00",
  breakStart: "13:00",
  breakEnd: "14:00",
  slotMinutes: 30,
});

const hhmm = (v: unknown) => {
  const s = str(v);
  return s && /^\d{2}:\d{2}/.test(s) ? s.slice(0, 5) : null;
};

export function availabilityFrom(payload: unknown): Availability {
  const raw = isObj(payload) ? (isObj(payload.availability) ? (payload.availability as Raw) : payload) : {};
  const byDay = new Map<number, Raw>();
  for (const w of listOf(raw, "workingHours")) {
    const d = num(w.dayOfWeek);
    if (d !== null && d >= 0 && d <= 6) byDay.set(d, w);
  }
  const workingHours = DAY_ORDER.map((dayOfWeek): WorkingDay => {
    const w = byDay.get(dayOfWeek);
    const base = defaultDay(dayOfWeek);
    if (!w) return base;
    return {
      dayOfWeek,
      isOff: w.isOff === true,
      startTime: hhmm(w.startTime) ?? base.startTime,
      endTime: hhmm(w.endTime) ?? base.endTime,
      breakStart: hhmm(w.breakStart),
      breakEnd: hhmm(w.breakEnd),
      slotMinutes: num(w.slotMinutes) ?? base.slotMinutes,
    };
  });
  const blockedDates = listOf(raw, "blockedDates")
    .flatMap((b): BlockedDate[] => {
      const d = str(b.date);
      if (!d) return [];
      const date = d.length > 10 ? clinicDateOf(d) : d; // the server may send a full timestamp
      return [{ date, reason: str(b.reason) ?? "" }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  return { workingHours, blockedDates };
}

export const createdIdFrom = (payload: unknown, key: string) => str(itemOf(payload, key)?.id);

/** { days: { "2026-11-12": [...] }, truncated } from /owner/schedule?view=calendar */
export function calendarFrom(payload: unknown): { days: Record<string, OwnerAppointment[]>; truncated: boolean } {
  const raw = isObj(payload) ? payload : {};
  const rawDays = sub(raw, "days");
  const days: Record<string, OwnerAppointment[]> = {};
  for (const [key, value] of Object.entries(rawDays)) {
    days[key] = (Array.isArray(value) ? value : []).filter(isObj).map(normalizeOwnerAppointment).filter((x): x is OwnerAppointment => x !== null);
  }
  return { days, truncated: raw.truncated === true };
}
