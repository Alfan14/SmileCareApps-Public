import { env } from "../config/env";

const DAY_MS = 24 * 60 * 60 * 1000;

export function dateKeyForInstant(instant: Date, timeZone = env.CLINIC_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Convert a clinic-local YYYY-MM-DD midnight to its UTC instant. */
export function clinicDateStart(dateKey: string, timeZone = env.CLINIC_TIMEZONE): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error("Invalid clinic date key");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const targetWallClock = Date.UTC(year, month - 1, day, 0, 0, 0);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new Error("Invalid calendar date");
  }

  // Iteratively account for the zone offset, including daylight-saving transitions.
  let guess = targetWallClock;
  for (let i = 0; i < 4; i += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const v = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const representedAsUtc = Date.UTC(Number(v.year), Number(v.month) - 1, Number(v.day), Number(v.hour), Number(v.minute), Number(v.second));
    const adjustment = representedAsUtc - targetWallClock;
    if (adjustment === 0) break;
    guess -= adjustment;
  }
  return new Date(guess);
}

export function addDateKeyDays(dateKey: string, days: number): string {
  const parts = dateKey.split("-").map(Number);

  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error("Invalid ISO date");
  }

  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}


export function clinicDayRange(dateKey: string, timeZone = env.CLINIC_TIMEZONE) {
  return { gte: clinicDateStart(dateKey, timeZone), lt: clinicDateStart(addDateKeyDays(dateKey, 1), timeZone) };
}

export function currentClinicDateKey(now = new Date()): string {
  return dateKeyForInstant(now);
}

export function startOfClinicMonth(now = new Date()): Date {
  return clinicDateStart(`${dateKeyForInstant(now).slice(0, 7)}-01`);
}

export function inclusiveDateKeys(fromKey: string, toKey: string): string[] {
  const result: string[] = [];
  let cursor = fromKey;
  while (cursor <= toKey && result.length < 93) {
    result.push(cursor);
    cursor = addDateKeyDays(cursor, 1);
  }
  return result;
}

export function shiftInstantDays(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * DAY_MS);
}
