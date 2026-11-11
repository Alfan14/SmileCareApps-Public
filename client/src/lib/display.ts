import { clinicDateOf, formatShortDate } from "./dates";

/** "Tue, 3 Nov 2026" in clinic time, or an en dash when the date is missing or invalid. */
export function dateOrDash(iso: string | null) {
  if (!iso || Number.isNaN(Date.parse(iso))) return "–";
  return formatShortDate(clinicDateOf(iso));
}

/** Day number and short month for the calendar badge on appointment cards. */
export function dayParts(iso: string) {
  const date = clinicDateOf(iso);
  return {
    day: String(Number(date.slice(8, 10))),
    month: new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)),
    weekday: new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)),
  };
}
