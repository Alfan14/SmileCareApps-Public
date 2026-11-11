import type { Appointment, CreateAppointmentPayload, Slot } from "../types/api";
import { api } from "./client";

/** Free times for one clinic date ("YYYY-MM-DD") and treatment. The server hides booked and held times. */
export const getSlots = (date: string, treatmentId: string) =>
  api<{ slots: Slot[] }>(`/slots?date=${encodeURIComponent(date)}&treatmentId=${encodeURIComponent(treatmentId)}`).then((r) => r.slots);

/** Holds a slot (status PENDING) for a few minutes. Needs a logged-in patient. */
export const createAppointment = (body: CreateAppointmentPayload) =>
  api<{ appointment: Appointment }>("/appointments", { method: "POST", body: JSON.stringify(body) });
