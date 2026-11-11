// Calendar helpers. The clinic is in India (IST, UTC+05:30, no daylight saving), so "today" and slot
// times are always shown in IST, whatever time zone the visitor's device uses.
// Dates are plain "YYYY-MM-DD" strings, which sort and compare correctly as text.

const CLINIC_OFFSET_MIN = 330;
const pad = (n: number) => String(n).padStart(2, "0");

export const isoFromParts = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

export const todayInClinic = () => new Date(Date.now() + CLINIC_OFFSET_MIN * 60_000).toISOString().slice(0, 10);

export function isValidIsoDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso; // rejects 2026-02-31
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday */
export const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

export const monthOf = (iso: string) => ({ year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 });

/** The days of one month as a flat list, with `null` padding so index 0 is always a Sunday. */
export function monthGrid(year: number, month: number): Array<string | null> {
  const lead = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [...Array.from<null>({ length: lead }).fill(null), ...Array.from({ length: count }, (_, i) => isoFromParts(year, month, i + 1))];
}

export const formatMonthYear = (year: number, month: number) =>
  new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)));

export const formatLongDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

export const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** "10:30 am" in clinic time, from an ISO timestamp. */
export const formatSlotTime = (startIso: string) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(new Date(startIso));

/** The clinic date (YYYY-MM-DD) that an ISO timestamp falls on. */
export const clinicDateOf = (startIso: string) => new Date(new Date(startIso).getTime() + CLINIC_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
