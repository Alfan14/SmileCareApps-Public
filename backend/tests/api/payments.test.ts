import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "test-session-secret-must-be-at-least-32-chars";
  process.env.CLIENT_URL = "http://localhost:5173";
  process.env.APP_URL = "http://localhost:5173";
  process.env.STRIPE_SECRET_KEY = "sk_test_unit_test_secret";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_unit_test_secret";
  process.env.CLINIC_ADDRESS = "Test Clinic Address";
});

const mocks = vi.hoisted(() => {
  const stripe = {
    checkoutCreate: vi.fn(),
    checkoutRetrieve: vi.fn(),
    checkoutExpire: vi.fn(),
    constructEvent: vi.fn(),
    refundCreate: vi.fn(),
  };
  const prisma = {
    appointment: {
      findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(),
    },
    payment: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    invoice: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    stripeEvent: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  };
  const email = {
    sendBookingConfirmation: vi.fn(),
    sendDentistNotification: vi.fn().mockResolvedValue(true),
    sendPatientNotification: vi.fn().mockResolvedValue(true),
    notify: vi.fn(async (...jobs: Array<Promise<unknown>>) => {
      await Promise.allSettled(jobs);
    }),
  };
  return { stripe, prisma, email };
});

vi.mock("../../src/config/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../../src/services/email.service", () => ({
  sendBookingConfirmation: mocks.email.sendBookingConfirmation,
  sendDentistNotification: mocks.email.sendDentistNotification,
  sendPatientNotification: mocks.email.sendPatientNotification,
  notify: mocks.email.notify,
}));
vi.mock("stripe", () => ({
  default: class StripeMock {
    checkout = { sessions: { create: mocks.stripe.checkoutCreate, retrieve: mocks.stripe.checkoutRetrieve, expire: mocks.stripe.checkoutExpire } };
    webhooks = { constructEvent: mocks.stripe.constructEvent };
    refunds = { create: mocks.stripe.refundCreate };
  },
}));

import { app } from "../../src/app";
import { SESSION_COOKIE } from "../../src/middleware/auth.middleware";

const secret = "test-session-secret-must-be-at-least-32-chars";
const appointmentId = "appointment-test-4";
const paymentId = "payment-test-4";
const sessionId = "cs_test_checkout_4";
const patientId = "patient-test-4";
const startTime = new Date(Date.now() + 3 * 24 * 60 * 60_000);
const endTime = new Date(startTime.getTime() + 45 * 60_000);
const futureHold = new Date(Date.now() + 8 * 60_000);

const payment = {
  id: paymentId,
  appointmentId,
  amount: 150000,
  currency: "inr",
  status: "PENDING",
  stripeSessionId: sessionId,
  stripePaymentIntentId: null,
  paidAt: null,
};
const invoice = {
  id: "invoice-test-4",
  paymentId,
  number: "INV-2026-TEST0004",
  issuedAt: new Date(),
  emailSentAt: null,
};
const appointment = {
  id: appointmentId,
  patientId,
  treatmentId: "treatment-cleaning",
  startTime,
  endTime,
  consultationType: "IN_CLINIC",
  status: "PENDING",
  holdExpiresAt: futureHold,
  createdAt: new Date(Date.now() - 2 * 60_000),
  meetLink: null,
  patient: { id: patientId, name: "Test Patient", email: "patient@example.test" },
  treatment: { id: "treatment-cleaning", name: "Teeth Cleaning", bookingPrice: 150000, active: true },
  payment: null as null | typeof payment | (typeof payment & { invoice: typeof invoice | null }),
};

function cookie(role: "PATIENT" | "OWNER" = "PATIENT") {
  const token = jwt.sign({ role }, secret, { subject: patientId, expiresIn: "1h", issuer: "smilecare-api", audience: "smilecare-client" });
  return `${SESSION_COOKIE}=${token}`;
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: sessionId,
    url: "https://checkout.stripe.test/cs_test_checkout_4",
    status: "open",
    expires_at: Math.floor((Date.now() + 30 * 60_000) / 1000),
    payment_status: "unpaid",
    mode: "payment",
    amount_total: 150000,
    currency: "inr",
    payment_intent: null,
    metadata: { appointmentId, patientId },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.prisma.appointment.findFirst.mockResolvedValue({ ...appointment, payment: null });
  mocks.prisma.appointment.findUnique.mockResolvedValue({ ...appointment, payment: { ...payment, invoice: { ...invoice } } });
  mocks.prisma.appointment.update.mockResolvedValue({ ...appointment, status: "CONFIRMED" });
  mocks.prisma.appointment.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.payment.findUnique.mockResolvedValue(null);
  mocks.prisma.payment.create.mockResolvedValue(payment);
  mocks.prisma.payment.update.mockResolvedValue({ ...payment, status: "PAID" });
  mocks.prisma.payment.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.invoice.findUnique.mockResolvedValue(null);
  mocks.prisma.invoice.create.mockResolvedValue(invoice);
  mocks.prisma.invoice.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.stripeEvent.findUnique.mockResolvedValue(null);
  mocks.prisma.stripeEvent.create.mockResolvedValue({ id: "evt_test_4", type: "checkout.session.expired" });
  mocks.prisma.stripeEvent.delete.mockResolvedValue({ id: "evt_test_4", type: "checkout.session.expired" });
  mocks.prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    if (typeof arg === "function") return arg(mocks.prisma);
    return undefined;
  });
  mocks.stripe.checkoutCreate.mockResolvedValue(session());
  mocks.stripe.checkoutRetrieve.mockResolvedValue(session());
  mocks.stripe.checkoutExpire.mockResolvedValue(session({ status: "expired" }));
  mocks.stripe.constructEvent.mockReturnValue({ id: "evt_test_4", type: "checkout.session.expired", data: { object: session() } });
  mocks.stripe.refundCreate.mockResolvedValue({ id: "re_test_4", status: "succeeded" });
  mocks.email.sendBookingConfirmation.mockResolvedValue(true);
});

describe("POST /api/payments/checkout", () => {
  it("creates a Checkout Session from server-side price data and extends the hold", async () => {
    const res = await request(app)
      .post("/api/payments/checkout")
      .set("Cookie", cookie())
      .set("Origin", "http://localhost:5173")
      .send({ appointmentId });

    expect(res.status).toBe(201);
    expect(res.body.checkoutUrl).toBe("https://checkout.stripe.test/cs_test_checkout_4");
    expect(mocks.stripe.checkoutCreate).toHaveBeenCalledOnce();
    const params = mocks.stripe.checkoutCreate.mock.calls[0]?.[0];
    expect(params.line_items[0].price_data.unit_amount).toBe(150000);
    expect(params.metadata.appointmentId).toBe(appointmentId);
    expect(mocks.prisma.payment.create).toHaveBeenCalledOnce();
  });

  it("expires an orphaned Checkout Session when the local payment transaction fails", async () => {
    mocks.prisma.$transaction.mockRejectedValueOnce(new Error("database unavailable"));
    const res = await request(app)
      .post("/api/payments/checkout")
      .set("Cookie", cookie())
      .set("Origin", "http://localhost:5173")
      .send({ appointmentId });

    expect(res.status).toBe(500);
    expect(mocks.stripe.checkoutExpire).toHaveBeenCalledWith(sessionId);
  });

  it("rejects checkout without a login", async () => {
    const res = await request(app).post("/api/payments/checkout").send({ appointmentId });
    expect(res.status).toBe(401);
    expect(mocks.stripe.checkoutCreate).not.toHaveBeenCalled();
  });

  it("rejects OWNER role because public checkout is patient-only", async () => {
    const res = await request(app).post("/api/payments/checkout").set("Cookie", cookie("OWNER")).send({ appointmentId });
    expect(res.status).toBe(403);
    expect(mocks.stripe.checkoutCreate).not.toHaveBeenCalled();
  });

  it("does not allow a patient to pay for another user's appointment", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/api/payments/checkout").set("Cookie", cookie()).send({ appointmentId });
    expect(res.status).toBe(404);
    expect(mocks.stripe.checkoutCreate).not.toHaveBeenCalled();
  });

  it("rejects an expired hold before creating a Stripe session", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue({ ...appointment, holdExpiresAt: new Date(Date.now() - 1000), payment: null });
    const res = await request(app).post("/api/payments/checkout").set("Cookie", cookie()).send({ appointmentId });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("BOOKING_EXPIRED");
    expect(mocks.stripe.checkoutCreate).not.toHaveBeenCalled();
  });

  it("reuses an existing open Checkout Session", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue({ ...appointment, payment: { ...payment } });
    mocks.stripe.checkoutRetrieve.mockResolvedValue(session());
    const res = await request(app).post("/api/payments/checkout").set("Cookie", cookie()).send({ appointmentId });
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe(sessionId);
    expect(mocks.stripe.checkoutCreate).not.toHaveBeenCalled();
  });
});

describe("GET /api/payments/appointments/:appointmentId", () => {
  it("returns payment status and invoice without exposing internal payment fields", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue({ ...appointment, payment: { ...payment, invoice: { ...invoice } } });
    const res = await request(app).get(`/api/payments/appointments/${appointmentId}`).set("Cookie", cookie());
    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("PENDING");
    expect(res.body.invoice.number).toBe(invoice.number);
    expect(res.body.payment.stripeSessionId).toBeUndefined();
  });
});

describe("POST /api/payments/webhook", () => {
  it("rejects an invalid Stripe signature", async () => {
    mocks.stripe.constructEvent.mockImplementation(() => { throw new Error("bad signature"); });
    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("stripe-signature", "invalid").send(JSON.stringify({ id: "evt_bad" }));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_WEBHOOK_SIGNATURE");
    expect(mocks.prisma.stripeEvent.create).not.toHaveBeenCalled();
  });

  it("processes an expiry event and returns success", async () => {
    mocks.stripe.constructEvent.mockReturnValue({ id: "evt_test_4", type: "checkout.session.expired", data: { object: session() } });
    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("stripe-signature", "sig_test").send(JSON.stringify({ id: "evt_test_4" }));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(Buffer.isBuffer(mocks.stripe.constructEvent.mock.calls[0]?.[0])).toBe(true);
    expect(mocks.prisma.stripeEvent.create).toHaveBeenCalledWith({ data: { id: "evt_test_4", type: "checkout.session.expired" } });
    expect(mocks.prisma.appointment.updateMany).toHaveBeenCalled();
    expect(mocks.prisma.payment.updateMany).toHaveBeenCalled();
  });


  it("marks a paid booking confirmed, creates an invoice, and sends one confirmation email", async () => {
    const paidSession = session({ status: "complete", payment_status: "paid", payment_intent: "pi_test_paid_4" });
    mocks.stripe.constructEvent.mockReturnValue({ id: "evt_paid_4", type: "checkout.session.completed", data: { object: paidSession } });
    mocks.prisma.stripeEvent.create.mockResolvedValue({ id: "evt_paid_4", type: "checkout.session.completed" });
    mocks.prisma.appointment.findUnique
      .mockResolvedValueOnce({ ...appointment, payment: { ...payment } })
      .mockResolvedValueOnce({ ...appointment, payment: { ...payment } })
      .mockResolvedValueOnce({
        ...appointment,
        status: "CONFIRMED",
        holdExpiresAt: null,
        payment: { ...payment, status: "PAID", stripePaymentIntentId: "pi_test_paid_4", invoice: { ...invoice } },
      });
    mocks.prisma.invoice.findUnique.mockResolvedValue(null);
    mocks.prisma.invoice.create.mockResolvedValue({ ...invoice });
    // This test asserts successful delivery, so the email mock must return true explicitly.
    mocks.email.sendBookingConfirmation.mockResolvedValue(true);

    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("stripe-signature", "sig_test").send(JSON.stringify({ id: "evt_paid_4" }));

    expect(res.status).toBe(200);
    expect(mocks.prisma.appointment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: appointmentId },
      data: expect.objectContaining({ status: "CONFIRMED", holdExpiresAt: null }),
    }));
    expect(mocks.prisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { appointmentId },
      data: expect.objectContaining({ status: "PAID", stripePaymentIntentId: "pi_test_paid_4" }),
    }));
    expect(mocks.prisma.invoice.create).toHaveBeenCalledOnce();
    expect(mocks.email.sendBookingConfirmation).toHaveBeenCalledOnce();
    expect(mocks.prisma.invoice.updateMany).toHaveBeenCalledOnce();
  });

  it("does not confirm a payment if the signed Checkout amount differs from the local amount", async () => {
    const mismatched = session({ status: "complete", payment_status: "paid", payment_intent: "pi_wrong_amount", amount_total: 1 });
    mocks.stripe.constructEvent.mockReturnValue({ id: "evt_wrong_amount_4", type: "checkout.session.completed", data: { object: mismatched } });
    mocks.prisma.stripeEvent.create.mockResolvedValue({ id: "evt_wrong_amount_4", type: "checkout.session.completed" });
    mocks.prisma.appointment.findUnique.mockResolvedValueOnce({ ...appointment, payment: { ...payment } });

    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("stripe-signature", "sig_test").send(JSON.stringify({ id: "evt_wrong_amount_4" }));

    expect(res.status).toBe(500);
    expect(mocks.prisma.appointment.update).not.toHaveBeenCalled();
    expect(mocks.prisma.payment.update).not.toHaveBeenCalled();
    expect(mocks.prisma.stripeEvent.delete).toHaveBeenCalledWith({ where: { id: "evt_wrong_amount_4" } });
  });

  it("does not confirm a payment if the signed Checkout currency differs from the local currency", async () => {
    const mismatched = session({ status: "complete", payment_status: "paid", payment_intent: "pi_wrong_currency", currency: "usd" });
    mocks.stripe.constructEvent.mockReturnValue({ id: "evt_wrong_currency_4", type: "checkout.session.completed", data: { object: mismatched } });
    mocks.prisma.stripeEvent.create.mockResolvedValue({ id: "evt_wrong_currency_4", type: "checkout.session.completed" });
    mocks.prisma.appointment.findUnique.mockResolvedValueOnce({ ...appointment, payment: { ...payment } });

    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("stripe-signature", "sig_test").send(JSON.stringify({ id: "evt_wrong_currency_4" }));

    expect(res.status).toBe(500);
    expect(mocks.prisma.appointment.update).not.toHaveBeenCalled();
    expect(mocks.prisma.payment.update).not.toHaveBeenCalled();
    expect(mocks.prisma.stripeEvent.delete).toHaveBeenCalledWith({ where: { id: "evt_wrong_currency_4" } });
  });

  it("refunds a paid checkout if the appointment hold expired or the slot is no longer available", async () => {
    const paidSession = session({ status: "complete", payment_status: "paid", payment_intent: "pi_test_conflict_4" });
    mocks.stripe.constructEvent.mockReturnValue({ id: "evt_conflict_4", type: "checkout.session.completed", data: { object: paidSession } });
    mocks.prisma.stripeEvent.create.mockResolvedValue({ id: "evt_conflict_4", type: "checkout.session.completed" });
    mocks.prisma.appointment.findUnique
      .mockResolvedValueOnce({ ...appointment, status: "CANCELLED", holdExpiresAt: null, payment: { ...payment } })
      .mockResolvedValueOnce({ ...appointment, status: "CANCELLED", holdExpiresAt: null, payment: { ...payment } });

    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("stripe-signature", "sig_test").send(JSON.stringify({ id: "evt_conflict_4" }));

    expect(res.status).toBe(200);
    expect(mocks.stripe.refundCreate).toHaveBeenCalledWith(expect.objectContaining({
      payment_intent: "pi_test_conflict_4",
      metadata: expect.objectContaining({ appointmentId, reason: "booking_conflict" }),
    }), { idempotencyKey: `booking-conflict-refund-${sessionId}` });
    expect(mocks.prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ appointmentId, stripeSessionId: sessionId }),
      data: expect.objectContaining({ status: "REFUNDED" }),
    }));
  });

  it("records an asynchronously pending conflict refund as REFUND_PENDING", async () => {
    const paidSession = session({ status: "complete", payment_status: "paid", payment_intent: "pi_test_pending_refund" });
    mocks.stripe.constructEvent.mockReturnValue({ id: "evt_pending_refund_4", type: "checkout.session.completed", data: { object: paidSession } });
    mocks.prisma.stripeEvent.create.mockResolvedValue({ id: "evt_pending_refund_4", type: "checkout.session.completed" });
    mocks.prisma.appointment.findUnique
      .mockResolvedValueOnce({ ...appointment, status: "CANCELLED", holdExpiresAt: null, payment: { ...payment } })
      .mockResolvedValueOnce({ ...appointment, status: "CANCELLED", holdExpiresAt: null, payment: { ...payment } });
    mocks.stripe.refundCreate.mockResolvedValue({ id: "re_pending_4", status: "pending" });

    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("stripe-signature", "sig_test").send(JSON.stringify({ id: "evt_pending_refund_4" }));

    expect(res.status).toBe(200);
    expect(mocks.prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "REFUND_PENDING", stripePaymentIntentId: "pi_test_pending_refund" }),
    }));
  });

  it("updates a pending refund when Stripe confirms the refund succeeded", async () => {
    const refund = {
      id: "re_test_4",
      status: "succeeded",
      payment_intent: "pi_test_conflict_4",
      metadata: { appointmentId, reason: "booking_conflict" },
    };
    mocks.stripe.constructEvent.mockReturnValue({ id: "evt_refund_updated_4", type: "refund.updated", data: { object: refund } });
    mocks.prisma.stripeEvent.create.mockResolvedValue({ id: "evt_refund_updated_4", type: "refund.updated" });

    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("stripe-signature", "sig_test").send(JSON.stringify({ id: "evt_refund_updated_4" }));

    expect(res.status).toBe(200);
    expect(mocks.prisma.payment.updateMany).toHaveBeenCalledWith({
      where: {
        appointmentId,
        stripePaymentIntentId: "pi_test_conflict_4",
        status: "REFUND_PENDING",
      },
      data: expect.objectContaining({
        status: "REFUNDED",
        refundedAt: expect.any(Date),
        failureReason: null,
      }),
    });
  });

  it("marks a pending refund as failed when Stripe reports refund failure", async () => {
    const refund = {
      id: "re_failed_4",
      status: "failed",
      payment_intent: "pi_test_conflict_4",
      metadata: { appointmentId, reason: "booking_conflict" },
    };
    mocks.stripe.constructEvent.mockReturnValue({ id: "evt_refund_failed_4", type: "refund.updated", data: { object: refund } });
    mocks.prisma.stripeEvent.create.mockResolvedValue({ id: "evt_refund_failed_4", type: "refund.updated" });

    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("stripe-signature", "sig_test").send(JSON.stringify({ id: "evt_refund_failed_4" }));

    expect(res.status).toBe(200);
    expect(mocks.prisma.payment.updateMany).toHaveBeenCalledWith({
      where: {
        appointmentId,
        stripePaymentIntentId: "pi_test_conflict_4",
        status: "REFUND_PENDING",
      },
      data: expect.objectContaining({
        status: "REFUND_FAILED",
        failureReason: "Refund failed",
      }),
    });
  });

  it("handles Stripe refund.failed events", async () => {
    const refund = {
      id: "re_failed_event_4",
      status: "failed",
      payment_intent: "pi_test_conflict_4",
      metadata: { appointmentId, reason: "booking_conflict" },
    };
    mocks.stripe.constructEvent.mockReturnValue({ id: "evt_refund_failed_event_4", type: "refund.failed", data: { object: refund } });
    mocks.prisma.stripeEvent.create.mockResolvedValue({ id: "evt_refund_failed_event_4", type: "refund.failed" });

    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("stripe-signature", "sig_test").send(JSON.stringify({ id: "evt_refund_failed_event_4" }));

    expect(res.status).toBe(200);
    expect(mocks.prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { appointmentId, stripePaymentIntentId: "pi_test_conflict_4", status: { in: ["REFUND_PENDING", "REFUNDED"] } },
      data: expect.objectContaining({
        status: "REFUND_FAILED",
        failureReason: "Refund failed",
      }),
    });
  });

  it("rechecks a duplicate event idempotently without creating a second event marker", async () => {
    mocks.prisma.stripeEvent.findUnique.mockResolvedValue({ id: "evt_test_4", type: "checkout.session.expired" });
    mocks.stripe.constructEvent.mockReturnValue({ id: "evt_test_4", type: "checkout.session.expired", data: { object: session() } });
    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("stripe-signature", "sig_test").send(JSON.stringify({ id: "evt_test_4" }));
    expect(res.status).toBe(200);
    expect(mocks.prisma.stripeEvent.create).not.toHaveBeenCalled();
    // State transitions are guarded by status predicates, so the handler can recover from a prior crash.
    expect(mocks.prisma.appointment.updateMany).toHaveBeenCalled();
    expect(mocks.prisma.payment.updateMany).toHaveBeenCalled();
  });
});
