import type { AppointmentStatus, MyAppointment } from "../types/api";

export type AppointmentTab = "upcoming" | "past" | "cancelled";

const ms = (iso: string | null) => (iso ? Date.parse(iso) : NaN);

/** A held slot (PENDING) that is still inside its payment window. */
export function isAwaitingPayment(a: MyAppointment, now: number) {
  if (a.status !== "PENDING") return false;
  const hold = ms(a.holdExpiresAt);
  return Number.isFinite(hold) ? hold > now : ms(a.startTime) >= now; // no hold info: judge by the start time
}

/** Which tab an appointment belongs to. `now` is passed in so this stays a pure function. */
export function tabOf(a: MyAppointment, now: number): AppointmentTab {
  switch (a.status) {
    case "CANCELLED":
      return "cancelled";
    case "PENDING":
      return isAwaitingPayment(a, now) ? "upcoming" : "cancelled"; // an expired hold is released
    case "COMPLETED":
    case "NO_SHOW":
      return "past";
    default:
      return ms(a.startTime) >= now ? "upcoming" : "past"; // CONFIRMED
  }
}

const byStartAsc = (a: MyAppointment, b: MyAppointment) => ms(a.startTime) - ms(b.startTime);
const byStartDesc = (a: MyAppointment, b: MyAppointment) => ms(b.startTime) - ms(a.startTime);

export function groupAppointments(list: MyAppointment[], now: number): Record<AppointmentTab, MyAppointment[]> {
  const groups: Record<AppointmentTab, MyAppointment[]> = { upcoming: [], past: [], cancelled: [] };
  for (const a of list) groups[tabOf(a, now)].push(a);
  groups.upcoming.sort(byStartAsc);
  groups.past.sort(byStartDesc);
  groups.cancelled.sort(byStartDesc);
  return groups;
}

/** The soonest confirmed appointment that has not happened yet. */
export function nextAppointment(list: MyAppointment[], now: number) {
  return list.filter((a) => a.status === "CONFIRMED" && ms(a.startTime) >= now).sort(byStartAsc)[0] ?? null;
}

const LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "Missed",
};

export function statusLabel(a: MyAppointment, now: number) {
  if (a.status === "PENDING" && !isAwaitingPayment(a, now)) return "Expired";
  return LABELS[a.status];
}
