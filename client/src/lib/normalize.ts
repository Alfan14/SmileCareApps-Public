import type { AppointmentStatus, MyAppointment, MyInvoice, MyPrescription, MyRecord } from "../types/api";
import { itemOf, listOf, num, str, sub } from "./raw";
import type { Raw } from "./raw";

// The dashboard APIs may answer with a bare array or wrap it ({ appointments: [...] }), and may send related data
// flat ("treatmentName") or nested ("treatment": { "name" }). These functions accept both, so a small difference
// in the server answer does not break the page. A wrong shape ends up here, not scattered through components.
// (The low-level readers live in ./raw.ts.)

const STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
const toStatus = (v: unknown): AppointmentStatus => {
  const s = typeof v === "string" ? v.toUpperCase() : "";
  return (STATUSES as string[]).includes(s) ? (s as AppointmentStatus) : "PENDING";
};

export function normalizeAppointment(raw: Raw): MyAppointment | null {
  const id = str(raw.id);
  const startTime = str(raw.startTime);
  if (!id || !startTime) return null;
  const treatment = sub(raw, "treatment");
  const payment = sub(raw, "payment");
  const invoice = sub(raw, "invoice");
  return {
    id,
    startTime,
    endTime: str(raw.endTime),
    status: toStatus(raw.status),
    consultationType: raw.consultationType === "VIDEO" ? "VIDEO" : "IN_CLINIC",
    meetLink: str(raw.meetLink),
    holdExpiresAt: str(raw.holdExpiresAt),
    treatmentName: str(treatment.name) ?? str(raw.treatmentName) ?? "Appointment",
    treatmentSlug: str(treatment.slug) ?? str(raw.treatmentSlug),
    paymentStatus: str(payment.status) ?? str(raw.paymentStatus),
    invoiceId: str(invoice.id) ?? str(raw.invoiceId),
    invoiceNumber: str(invoice.number) ?? str(raw.invoiceNumber),
    amount: num(payment.amount) ?? num(raw.amount),
    treatmentId: str(treatment.id) ?? str(raw.treatmentId),
    rescheduleCount: num(raw.rescheduleCount) ?? 0,
    reviewId: str(sub(raw, "review").id) ?? str(raw.reviewId),
    paymentFailureReason: str(payment.failureReason) ?? str(raw.paymentFailureReason),
    cancelReason: str(raw.cancelReason),
  };
}

export function normalizeRecord(raw: Raw): MyRecord | null {
  const id = str(raw.id);
  if (!id) return null;
  return {
    id,
    title: str(raw.title) ?? str(raw.treatmentName) ?? "Treatment record",
    summary: str(raw.summary) ?? str(raw.notes) ?? "",
    toothNo: str(raw.toothNo),
    date: str(raw.date) ?? str(raw.createdAt),
    appointmentId: str(raw.appointmentId),
  };
}

export function normalizePrescription(raw: Raw): MyPrescription | null {
  const id = str(raw.id);
  const medicine = str(raw.medicine);
  if (!id || !medicine) return null;
  return {
    id,
    medicine,
    instructions: str(raw.instructions) ?? "",
    date: str(raw.date) ?? str(raw.createdAt),
    recordTitle: str(sub(raw, "record").title) ?? str(raw.recordTitle),
  };
}

export function normalizeInvoice(raw: Raw): MyInvoice | null {
  const id = str(raw.id);
  if (!id) return null;
  const payment = sub(raw, "payment");
  const appointment = sub(payment, "appointment");
  const patient = sub(raw, "patient");
  return {
    id,
    number: str(raw.number) ?? str(raw.invoiceNumber) ?? id,
    issuedAt: str(raw.issuedAt) ?? str(payment.paidAt) ?? str(raw.createdAt),
    amount: num(raw.amount) ?? num(payment.amount),
    status: str(payment.status) ?? str(raw.status) ?? "PAID", // an invoice only exists once a payment succeeded
    description:
      str(raw.description) ?? str(raw.treatmentName) ?? str(sub(raw, "treatment").name) ?? str(sub(appointment, "treatment").name) ?? "Dental visit",
    appointmentId: str(raw.appointmentId) ?? str(payment.appointmentId),
    patientName: str(patient.name),
    patientEmail: str(patient.email),
  };
}

export const appointmentsFrom = (payload: unknown) =>
  listOf(payload, "appointments").map(normalizeAppointment).filter((x): x is MyAppointment => x !== null);
export const recordsFrom = (payload: unknown) => listOf(payload, "records").map(normalizeRecord).filter((x): x is MyRecord => x !== null);
export const prescriptionsFrom = (payload: unknown) =>
  listOf(payload, "prescriptions").map(normalizePrescription).filter((x): x is MyPrescription => x !== null);
export const invoicesFrom = (payload: unknown) => listOf(payload, "invoices").map(normalizeInvoice).filter((x): x is MyInvoice => x !== null);
export const invoiceFrom = (payload: unknown) => {
  const raw = itemOf(payload, "invoice");
  return raw ? normalizeInvoice(raw) : null;
};
