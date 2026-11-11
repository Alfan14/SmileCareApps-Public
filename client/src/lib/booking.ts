import { addDays, isValidIsoDate, todayInClinic, weekdayOf } from "./dates";

// Booking rules shown in the UI. The server is the authority and re-checks everything.
// Keep CLOSED_WEEKDAYS in sync with the working hours seeded in server/prisma/seed.ts (Sunday off).
export const CLOSED_WEEKDAYS: readonly number[] = [0];
export const BOOKING_HORIZON_DAYS = 60;

export const TODAY = todayInClinic();
export const LAST_BOOKABLE_DATE = addDays(TODAY, BOOKING_HORIZON_DAYS);

export const isClosedDay = (iso: string) => CLOSED_WEEKDAYS.includes(weekdayOf(iso));

/** True for a real date from today up to the horizon on a day the clinic is open. */
export const isBookableDate = (iso: string) => isValidIsoDate(iso) && iso >= TODAY && iso <= LAST_BOOKABLE_DATE && !isClosedDay(iso);
