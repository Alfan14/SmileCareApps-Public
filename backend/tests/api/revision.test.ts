import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "test-session-secret-must-be-at-least-32-chars";
  process.env.CLIENT_URL = "http://localhost:5173";
});

const mocks = vi.hoisted(() => ({
  prisma: {
    appointment: { findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    payment: { findUnique: vi.fn(), update: vi.fn() },
    review: { create: vi.fn() },
    treatmentRecord: { findFirst: vi.fn() },
    treatment: { findFirst: vi.fn() },
    workingHours: { findUnique: vi.fn() },
    blockedDate: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  refundCreate: vi.fn(),
  sessionExpire: vi.fn(),
  dentistMail: vi.fn(),
  patientMail: vi.fn(),
}));

vi.mock("../../src/config/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("stripe", () => ({
  default: class {
    refunds = { create: mocks.refundCreate };
    checkout = { sessions: { expire: mocks.sessionExpire, retrieve: vi.fn(), create: vi.fn() } };
    webhooks = { constructEvent: vi.fn() };
  },
}));
vi.mock("../../src/services/email.service", () => ({
  notify: async (...jobs: Promise<unknown>[]) => { await Promise.allSettled(jobs); },
  sendBookingConfirmation: vi.fn(),
  sendDentistNotification: mocks.dentistMail,
  sendPatientNotification: mocks.patientMail,
}));

import { cancelAppointment, cancelAppointmentAsOwner, rescheduleAppointment } from "../../src/services/appointments.service";
import { submitReview } from "../../src/services/reviews.service";
import { loadReport } from "../../src/services/report-pdf.service";

const NOW = new Date("2026-11-10T00:00:00.000Z");
const inHours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

const appt = (over: Record<string, unknown> = {}) => ({
  id: "a1", patientId: "p1", treatmentId: "t1", status: "CONFIRMED",
  startTime: inHours(72), endTime: inHours(72.5), consultationType: "IN_CLINIC", rescheduleCount: 0,
  patient: { name: "Priya Sharma", email: "priya@example.com", phone: null },
  treatment: { id: "t1", name: "Cleaning", durationMin: 30 },
  payment: { id: "pay1", status: "PAID", stripeSessionId: "cs_1", stripePaymentIntentId: "pi_1" },
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.dentistMail.mockResolvedValue(true);
  mocks.patientMail.mockResolvedValue(true);
  mocks.prisma.appointment.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.payment.update.mockResolvedValue({});
});

describe("cancelAppointment", () => {
  it("refunds a paid, confirmed appointment and emails dentist + patient", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue(appt());
    mocks.prisma.payment.findUnique.mockResolvedValue({ id: "pay1", status: "PAID", stripePaymentIntentId: "pi_1" });
    mocks.refundCreate.mockResolvedValue({ id: "re_1", status: "succeeded" });

    const result = await cancelAppointment("p1", "a1", "Travelling", NOW);

    expect(result).toEqual({ id: "a1", status: "CANCELLED", refundStatus: "REFUNDED" });
    expect(mocks.refundCreate).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: "pi_1" }), expect.objectContaining({ idempotencyKey: "refund-pay1" }));
    expect(mocks.dentistMail).toHaveBeenCalledWith(expect.objectContaining({ event: "CANCELLED" }));
    expect(mocks.patientMail).toHaveBeenCalledWith(expect.objectContaining({ event: "CANCELLED" }));
  });

  it("rejects cancelling inside the 24h cutoff", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue(appt({ startTime: inHours(5), endTime: inHours(5.5) }));
    await expect(cancelAppointment("p1", "a1", undefined, NOW)).rejects.toMatchObject({ status: 409, code: "TOO_LATE" });
    expect(mocks.refundCreate).not.toHaveBeenCalled();
  });

  it("records REFUND_FAILED (and warns the dentist) when Stripe rejects the refund", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue(appt());
    mocks.prisma.payment.findUnique.mockResolvedValue({ id: "pay1", status: "PAID", stripePaymentIntentId: "pi_1" });
    mocks.refundCreate.mockRejectedValue(new Error("stripe down"));

    const result = await cancelAppointment("p1", "a1", undefined, NOW);

    expect(result.refundStatus).toBe("REFUND_FAILED");
    expect(mocks.prisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "REFUND_FAILED" }) }));
    expect(mocks.dentistMail).toHaveBeenCalledWith(expect.objectContaining({ note: expect.stringContaining("FAILED") }));
  });

  it("is a no-op for someone else's appointment (404) and for already-cancelled ones (409)", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValueOnce(null);
    await expect(cancelAppointment("intruder", "a1", undefined, NOW)).rejects.toMatchObject({ status: 404 });
    mocks.prisma.appointment.findFirst.mockResolvedValueOnce(appt({ status: "CANCELLED" }));
    await expect(cancelAppointment("p1", "a1", undefined, NOW)).rejects.toMatchObject({ code: "NOT_CANCELLABLE" });
  });

  it("closes the open Stripe Checkout page when a PENDING hold is cancelled", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue(appt({ status: "PENDING", payment: { id: "pay1", status: "PENDING", stripeSessionId: "cs_1" } }));
    await cancelAppointment("p1", "a1", undefined, NOW);
    expect(mocks.sessionExpire).toHaveBeenCalledWith("cs_1");
    expect(mocks.refundCreate).not.toHaveBeenCalled();
  });

  it("lets the clinic cancel inside the cutoff", async () => {
    mocks.prisma.appointment.findUnique.mockResolvedValue(appt({ startTime: inHours(2), endTime: inHours(2.5), payment: null }));
    await expect(cancelAppointmentAsOwner("a1", "Dentist unwell", NOW)).resolves.toMatchObject({ status: "CANCELLED" });
  });
});

describe("rescheduleAppointment", () => {
  it("enforces the 24h cutoff and the reschedule limit", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValueOnce(appt({ startTime: inHours(3), endTime: inHours(3.5) }));
    await expect(rescheduleAppointment("p1", "a1", inHours(100).toISOString(), NOW)).rejects.toMatchObject({ code: "TOO_LATE" });
    mocks.prisma.appointment.findFirst.mockResolvedValueOnce(appt({ rescheduleCount: 2 }));
    await expect(rescheduleAppointment("p1", "a1", inHours(100).toISOString(), NOW)).rejects.toMatchObject({ code: "RESCHEDULE_LIMIT" });
  });

  it("rejects a slot the public API does not offer", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue(appt());
    mocks.prisma.treatment.findFirst.mockResolvedValue({ id: "t1", durationMin: 30 });
    mocks.prisma.workingHours.findUnique.mockResolvedValue(null); // clinic closed that day
    mocks.prisma.blockedDate.findUnique.mockResolvedValue(null);
    await expect(rescheduleAppointment("p1", "a1", inHours(100).toISOString(), NOW)).rejects.toMatchObject({ code: "SLOT_TAKEN" });
  });
});

describe("submitReview", () => {
  const found = (over: Record<string, unknown> = {}) => ({ id: "a1", status: "COMPLETED", patient: { name: "Priya Sharma" }, review: null, ...over });

  it("creates an unapproved review with an abbreviated author name", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue(found());
    mocks.prisma.review.create.mockResolvedValue({ id: "r1" });
    await submitReview("p1", { appointmentId: "a1", rating: 5, comment: "Very gentle dentist" });
    expect(mocks.prisma.review.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ authorName: "Priya S.", approved: false, appointmentId: "a1", patientId: "p1" }),
    }));
  });

  it("blocks reviews before completion and duplicate reviews", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValueOnce(found({ status: "CONFIRMED" }));
    await expect(submitReview("p1", { appointmentId: "a1", rating: 4, comment: "Nice clinic" })).rejects.toMatchObject({ code: "NOT_COMPLETED" });
    mocks.prisma.appointment.findFirst.mockResolvedValueOnce(found({ review: { id: "r0" } }));
    await expect(submitReview("p1", { appointmentId: "a1", rating: 4, comment: "Nice clinic" })).rejects.toMatchObject({ code: "ALREADY_REVIEWED" });
  });
});

describe("treatment report access", () => {
  it("scopes patient lookups to their own records", async () => {
    mocks.prisma.treatmentRecord.findFirst.mockResolvedValue(null);
    await expect(loadReport("rec1", { role: "PATIENT", patientId: "p1" })).rejects.toMatchObject({ status: 404 });
    expect(mocks.prisma.treatmentRecord.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "rec1", patientId: "p1" } }));
  });
});
