import { addDays, todayInClinic } from "../lib/dates";
import { toPayload } from "../lib/availability";
import type { AvailabilityForm } from "../lib/availability";
import {
  ownerAppointmentsFrom,
  ownerPatientsFrom,
  availabilityFrom,
  createdIdFrom,
  statsFrom,
} from "../lib/normalizeOwner";
import type {
  Availability,
  AppointmentStatus,
  PrescriptionInput,
  RecordInput,
} from "../types/api";
import { api } from "./client";
import { calendarFrom, ownerAppointmentsFrom as listFrom } from "../lib/normalizeOwner";
import type { OwnerAppointment } from "../types/api";

// Every endpoint below needs a logged-in OWNER.
// The server answers 401/403 for anyone else.

const send = (
  method: "POST" | "PATCH" | "PUT",
  body: unknown,
): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

// Extracts an array from a backend { data: [...] } response.
function responseData(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (typeof payload === "object" && payload !== null) {
    const data = (payload as { data?: unknown }).data;

    if (Array.isArray(data)) return data;
  }

  return [];
}

// Checks whether a working day's settings have changed.
function sameWorkingDay(
  a: Availability["workingHours"][number],
  b: Availability["workingHours"][number],
): boolean {
  return (
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    (a.breakStart ?? null) === (b.breakStart ?? null) &&
    (a.breakEnd ?? null) === (b.breakEnd ?? null) &&
    a.slotMinutes === b.slotMinutes &&
    a.isOff === b.isOff
  );
}

export const getOwnerStats = () =>
  api<unknown>("/owner/dashboard").then(statsFrom);
export const getOwnerAppointments = (date: string) =>
  api<unknown>(
    `/owner/schedule?date=${encodeURIComponent(date)}`,
  ).then(ownerAppointmentsFrom);
export const setAppointmentStatus = (
  id: string,
  status: AppointmentStatus,
) =>
  status === "CANCELLED"
    ? // Clinic-side cancel: frees the slot, refunds any paid fee and emails the patient.
      api<unknown>(`/owner/appointments/${encodeURIComponent(id)}/cancel`, send("POST", {}))
    : api<unknown>(
        `/owner/appointments/${encodeURIComponent(id)}`,
        send("PATCH", { status }),
      );
export const getOwnerPatients = () =>
  api<unknown>("/owner/patients").then(ownerPatientsFrom);
export const createRecord = (body: RecordInput) =>
  api<unknown>("/owner/records", send("POST", body)).then((response) => ({
    id: createdIdFrom(response, "record"),
  }));
export const createPrescription = (body: PrescriptionInput) =>
  api<unknown>("/owner/prescriptions", send("POST", body)).then((response) => ({
    id: createdIdFrom(response, "prescription"),
  }));
export const getAvailability = async (): Promise<Availability> => {
  const from = todayInClinic();
  const to = addDays(from, 365);
  const [hoursResponse, blockedResponse] = await Promise.all([
    api<unknown>("/owner/working-hours"),
    api<unknown>(
      `/owner/blocked-dates?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),
  ]);
  return availabilityFrom({
    workingHours: responseData(hoursResponse),
    blockedDates: responseData(blockedResponse),
  });
};
export const saveAvailability = async (
  form: AvailabilityForm,
): Promise<void> => {
  const desired = toPayload(form);

  // Fetch the latest server state before calculating changes.
  const current = await getAvailability();

  const requests: Promise<unknown>[] = [];

  // 1. Update only working days that have changed.
  const currentHours = new Map(
    current.workingHours.map((day) => [day.dayOfWeek, day]),
  );

  for (const nextDay of desired.workingHours) {
    const previousDay = currentHours.get(nextDay.dayOfWeek);

    if (!previousDay || !sameWorkingDay(previousDay, nextDay)) {
      // dayOfWeek belongs in the URL, not in the request body.
      const { dayOfWeek, ...body } = nextDay;

      requests.push(
        api<unknown>(
          `/owner/working-hours/${dayOfWeek}`,
          send("PUT", body),
        ),
      );
    }
  }

  // 2. Compare existing and desired blocked dates.
  const currentBlocked = new Set(
    current.blockedDates.map((item) => item.date),
  );

  const desiredBlocked = new Set(
    desired.blockedDates.map((item) => item.date),
  );

  // 3. Delete dates removed from the form.
  for (const item of current.blockedDates) {
    if (!desiredBlocked.has(item.date)) {
      requests.push(
        api<unknown>(
          `/owner/blocked-dates/${encodeURIComponent(item.date)}`,
          {
            method: "DELETE",
          },
        ),
      );
    }
  }

  // 4. Create newly added blocked dates.
  for (const item of desired.blockedDates) {
    if (!currentBlocked.has(item.date)) {
      requests.push(
        api<unknown>(
          "/owner/blocked-dates",
          send("POST", {
            date: item.date,
            reason: item.reason.trim() || null,
          }),
        ),
      );
    }
  }

  // Wait for all requested changes to finish.
  await Promise.all(requests);
};
export type ScheduleFilters = {
  status?: AppointmentStatus | "";
  paymentStatus?: string;
  consultationType?: "IN_CLINIC" | "VIDEO" | "";
  q?: string;
};

function scheduleQuery(
  base: Record<string, string>,
  f: ScheduleFilters,
) {
  const params = new URLSearchParams(base);

  if (f.status) params.set("status", f.status);
  if (f.paymentStatus) params.set("paymentStatus", f.paymentStatus);
  if (f.consultationType) params.set("consultationType", f.consultationType);
  if (f.q?.trim()) params.set("q", f.q.trim());

  return params.toString();
}

/** One day, filtered. */
export const getOwnerDay = (
  date: string,
  f: ScheduleFilters = {},
) =>
  api<unknown>(
    `/owner/schedule?${scheduleQuery({ date, limit: "100" }, f)}`,
  ).then(listFrom);

/** Appointments between two clinic dates. */
export const getOwnerCalendar = (
  from: string,
  to: string,
  f: ScheduleFilters = {},
) =>
  api<unknown>(
    `/owner/schedule?${scheduleQuery({ from, to, view: "calendar" }, f)}`,
  ).then(calendarFrom);

export type CalendarData = {
  days: Record<string, OwnerAppointment[]>;
  truncated: boolean;
};

/** Retry a failed Stripe refund. */
export const retryRefund = (appointmentId: string) =>
  api<{ status: string }>(
    `/owner/appointments/${encodeURIComponent(appointmentId)}/retry-refund`,
    send("POST", {}),
  );
