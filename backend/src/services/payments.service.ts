import Stripe from "stripe";
import { Prisma, PaymentStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { HttpError } from "../middleware/errors";
import {
  notify,
  sendBookingConfirmation,
  sendDentistNotification,
  sendPatientNotification,
} from "./email.service";
import { ensureMeetLinkForAppointment } from "./meet.service";

export const stripe: Stripe = new Stripe(env.STRIPE_SECRET_KEY ?? "sk_test_mock");

export function getStripeClient(): Stripe {
  return stripe;
}

const STATUS_PENDING = PaymentStatus.PENDING;
const STATUS_PAID = PaymentStatus.PAID;
const STATUS_FAILED = PaymentStatus.FAILED;
const STATUS_REFUNDED = PaymentStatus.REFUNDED;
const STATUS_REFUND_PENDING = "REFUND_PENDING" as PaymentStatus;
const STATUS_REFUND_FAILED = "REFUND_FAILED" as PaymentStatus;

/**
 * Creates or reuses a Checkout Session for an appointment.
 * The appointment must still have an active booking hold.
 */
export async function startCheckoutForAppointment(
  userId: string,
  appointmentId: string,
) {
  // 1. Fetch appointment & verify ownership
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId: userId },
    include: { treatment: true, patient: true, payment: true },
  });

  if (!appointment) {
    throw new HttpError(404, "NOT_FOUND", "Appointment not found");
  }

  // 2. Reject if the booking hold has already expired
  if (
    appointment.holdExpiresAt &&
    appointment.holdExpiresAt.getTime() <= Date.now()
  ) {
    throw new HttpError(409, "BOOKING_EXPIRED", "Appointment hold has expired");
  }

  // Do not create a second checkout for an already processed/refunded payment.
  if (
    appointment.payment?.status === STATUS_PAID ||
    appointment.payment?.status === STATUS_REFUNDED ||
    appointment.payment?.status === STATUS_REFUND_PENDING ||
    appointment.payment?.status === STATUS_REFUND_FAILED
  ) {
    throw new HttpError(
      409,
      "PAYMENT_ALREADY_PROCESSED",
      "This appointment payment has already been processed. Please check your appointment status.",
    );
  }

  // 3. Reuse an existing open Stripe Checkout Session when possible
  if (appointment.payment?.stripeSessionId) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(
        appointment.payment.stripeSessionId,
      );
      if (existingSession.status === "open") {
        return {
          reused: true,
          url: existingSession.url,
          sessionId: existingSession.id,
          expiresAt: existingSession.expires_at,
        };
      }
      if (existingSession.status === "complete") {
        throw new HttpError(
          409,
          "PAYMENT_PROCESSING",
          existingSession.payment_status === "paid"
            ? "Payment has completed and is awaiting confirmation. Please refresh your appointment status."
            : "Checkout has completed but its payment outcome is not yet final. Please contact support before starting another payment.",
        );
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      // Fall through to create a new session if retrieval fails.
    }
  }

  // 4. Create a new Stripe Checkout Session
  const amount =
    appointment.treatment?.bookingPrice ?? appointment.payment?.amount ?? 0;
  const currency = (appointment.payment?.currency ?? "inr").toLowerCase();
  const treatmentName = appointment.treatment?.name ?? "Consultation";
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: appointment.patient.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: { name: treatmentName },
        },
      },
    ],
    metadata: { appointmentId: appointment.id },
    payment_intent_data: { metadata: { appointmentId: appointment.id } },
    expires_at: expiresAt,
    success_url: `${env.APP_URL}/book/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/book?cancelled=1`,
  });

  // 5. Persist payment & extend hold. Expire Stripe session if DB update fails.
  try {
    const holdExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      if (appointment.payment) {
        // Reuse the one-payment-per-appointment row when an earlier Checkout
        // Session expired or failed. Do not create a duplicate Payment row.
        await tx.payment.update({
          where: { appointmentId: appointment.id },
          data: {
            amount,
            currency,
            method: "card",
            status: STATUS_PENDING,
            stripeSessionId: session.id,
            stripePaymentIntentId: null,
            stripeRefundId: null,
            paidAt: null,
            refundedAt: null,
            failureReason: null,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            appointmentId: appointment.id,
            amount,
            currency,
            method: "card",
            status: STATUS_PENDING,
            stripeSessionId: session.id,
          },
        });
      }

      await tx.appointment.update({
        where: { id: appointment.id },
        data: { holdExpiresAt },
      });
    });
  } catch (error) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    throw error;
  }

  return {
    reused: false,
    url: session.url,
    sessionId: session.id,
    expiresAt,
  };
}

export async function getPaymentForAppointment(
  userId: string,
  appointmentId: string,
) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId: userId },
    include: {
      payment: {
        include: { invoice: true },
      },
    },
  });

  if (!appt) {
    throw new HttpError(404, "NOT_FOUND", "Appointment not found");
  }

  return {
    payment: appt.payment
      ? {
          status: appt.payment.status,
          amount: appt.payment.amount,
          currency: appt.payment.currency,
          paidAt: appt.payment.paidAt,
        }
      : null,
    invoice: appt.payment?.invoice
      ? {
          number: appt.payment.invoice.number,
          issuedAt: appt.payment.invoice.issuedAt,
        }
      : null,
  };
}

/**
 * Idempotent webhook processing. Processing errors are rethrown so Stripe
 * receives a 5xx response and can retry the event.
 */
export async function handleStripeEvent(event: Stripe.Event) {
  const existing = await prisma.stripeEvent
    .findUnique({ where: { id: event.id } })
    .catch(() => null);

  // Re-processing an existing event is intentional: it lets an operator replay
  // an event after fixing a transient processing problem.
  if (existing) {
    await processEventLogic(event);
    return;
  }

  try {
    await prisma.stripeEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      await processEventLogic(event);
      return;
    }
    throw error;
  }

  try {
    await processEventLogic(event);
  } catch (error) {
    await prisma.stripeEvent
      .delete({ where: { id: event.id } })
      .catch(() => undefined);
    throw error;
  }
}

async function processEventLogic(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      // For a completed Checkout Session, event.created is the event's original
      // Stripe timestamp. Do not compare the hold with the later webhook retry time.
      await onCompleted(
        event.data.object as Stripe.Checkout.Session,
        new Date(event.created * 1000),
      );
      break;
    case "checkout.session.expired":
      await onExpired(event.data.object as Stripe.Checkout.Session);
      break;
    case "checkout.session.async_payment_failed":
      await onPaymentFailed(event.data.object as Stripe.Checkout.Session);
      break;
    case "payment_intent.payment_failed":
      await onIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case "charge.refunded":
      await onChargeRefunded(event.data.object as Stripe.Charge);
      break;
    case "refund.updated":
    case "charge.refund.updated":
      await onRefundUpdated(event.data.object as Stripe.Refund);
      break;
    case "refund.failed":
      await onRefundFailed(event.data.object as Stripe.Refund);
      break;
    default:
      break;
  }
}

async function onExpired(session: Stripe.Checkout.Session) {
  await failCheckout(
    session,
    "Checkout session expired before payment was completed",
  );
}

/** Delayed payment methods can fail after the customer has left Checkout. */
async function onPaymentFailed(session: Stripe.Checkout.Session) {
  await failCheckout(session, "Payment failed");
}

/**
 * Release the slot and mark the payment FAILED, but only while both records
 * are still pending. A late failure event must not overwrite a paid payment.
 */
async function failCheckout(
  session: Stripe.Checkout.Session,
  reason: string,
) {
  const appointmentId = session.metadata?.appointmentId;
  if (!appointmentId) return;

  const [cancelled, failed] = await prisma.$transaction([
    prisma.appointment.updateMany({
      where: { id: appointmentId, status: "PENDING" },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    }),
    prisma.payment.updateMany({
      where: {
        appointmentId,
        stripeSessionId: session.id,
        status: STATUS_PENDING,
      },
      data: { status: STATUS_FAILED, failureReason: reason },
    }),
  ]);

  if (cancelled.count === 0 || failed.count === 0) return;

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, treatment: true },
  });
  if (!appt) return;

  await notify(
    sendPatientNotification(
      noticeFor("PAYMENT_FAILED", appt, { reason }),
    ),
  );
}

/** A declined card attempt is recorded, but Checkout remains available for retry. */
async function onIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const appointmentId = paymentIntent.metadata?.appointmentId;
  if (!appointmentId) return;

  await prisma.payment.updateMany({
    where: { appointmentId, status: STATUS_PENDING },
    data: {
      failureReason:
        paymentIntent.last_payment_error?.message ?? "Card was declined",
    },
  });
}

type NoticeAppt = {
  startTime: Date;
  consultationType: string;
  patient: { name: string; email: string; phone: string | null };
  treatment: { name: string };
};

const fmtWhen = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: env.CLINIC_TIMEZONE,
  }).format(date);

export function noticeFor(
  event: Parameters<typeof sendPatientNotification>[0]["event"],
  appt: NoticeAppt,
  extra: {
    reason?: string | null | undefined;
    previousStart?: Date | undefined;
    note?: string | undefined;
  } = {},
) {
  return {
    event,
    patientName: appt.patient.name,
    patientEmail: appt.patient.email,
    patientPhone: appt.patient.phone,
    treatment: appt.treatment.name,
    whenText: fmtWhen(appt.startTime),
    previousWhenText: extra.previousStart
      ? fmtWhen(extra.previousStart)
      : undefined,
    consultationType: appt.consultationType,
    reason: extra.reason,
    note: extra.note,
  };
}

/**
 * Refund a PAID appointment payment through Stripe.
 * Returns the resulting payment status, or null when it cannot be refunded.
 */
export async function refundPaymentForAppointment(
  appointmentId: string,
  reason: string,
  opts: { retry?: boolean } = {},
): Promise<PaymentStatus | null> {
  const payment = await prisma.payment.findUnique({
    where: { appointmentId },
  });
  const refundable = opts.retry ? STATUS_REFUND_FAILED : STATUS_PAID;

  if (!payment || payment.status !== refundable) return null;

  if (!payment.stripePaymentIntentId) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: STATUS_REFUND_FAILED,
        failureReason: "Missing Stripe payment intent",
      },
    });
    return STATUS_REFUND_FAILED;
  }

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: payment.stripePaymentIntentId,
        metadata: { appointmentId, reason },
      },
      {
        idempotencyKey: opts.retry
          ? `refund-${payment.id}-retry-${Date.now()}`
          : `refund-${payment.id}`,
      },
    );

    const status: PaymentStatus =
      refund.status === "succeeded"
        ? STATUS_REFUNDED
        : refund.status === "failed" || refund.status === "canceled"
          ? STATUS_REFUND_FAILED
          : STATUS_REFUND_PENDING;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        stripeRefundId: refund.id,
        failureReason:
          status === STATUS_REFUND_FAILED
            ? refund.failure_reason ?? "Refund failed"
            : null,
        refundedAt: status === STATUS_REFUNDED ? new Date() : null,
      },
    });

    return status;
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: STATUS_REFUND_FAILED,
        failureReason:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Refund failed",
      },
    });
    return STATUS_REFUND_FAILED;
  }
}

/** Close an open Checkout Session when its appointment is cancelled. */
export async function expireCheckoutSession(
  sessionId: string,
): Promise<void> {
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch {
    // It may already be expired or completed. The webhook/conflict logic remains authoritative.
  }
}

/** Owner action: retry a REFUND_FAILED refund. */
export async function retryRefund(appointmentId: string) {
  const status = await refundPaymentForAppointment(
    appointmentId,
    "owner_retry",
    { retry: true },
  );

  if (status === null) {
    throw new HttpError(
      409,
      "NOT_RETRYABLE",
      "Only payments with a failed refund can be retried",
    );
  }

  return { status };
}

type HoldCancellationFields = {
  status: string;
  holdExpiresAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
};

/**
 * Some cleanup jobs cancel an appointment when its hold expires. If Stripe's
 * completed event was created before the hold deadline, that automatic
 * cancellation can be recovered, provided it is clearly an expiry cancellation
 * and no other confirmed appointment has taken the slot.
 *
 * We deliberately do not recover patient/clinic cancellations or cancellations
 * whose reason cannot be identified as an expired hold.
 */
function isRecoverableExpiredHoldCancellation(
  appt: HoldCancellationFields,
  paymentCompletedAt: Date,
): boolean {
  if (
    appt.status !== "CANCELLED" ||
    !appt.holdExpiresAt ||
    !appt.cancelledAt
  ) {
    return false;
  }

  const paidBeforeDeadline =
    paymentCompletedAt.getTime() <= appt.holdExpiresAt.getTime();
  const cancelledAfterDeadline =
    appt.cancelledAt.getTime() >= appt.holdExpiresAt.getTime();
  const normalizedReason = (appt.cancelReason ?? "")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  const reasonIdentifiesHoldExpiry =
    /\b(hold|booking|appointment)\b.*\b(expired|expiry|expiration)\b|\b(expired|expiry|expiration)\b.*\b(hold|booking|appointment)\b/i.test(
      normalizedReason,
    );

  return (
    paidBeforeDeadline &&
    cancelledAfterDeadline &&
    reasonIdentifiesHoldExpiry
  );
}

/**
 * Complete a paid Checkout Session.
 * IMPORTANT: compare the original Stripe event time with holdExpiresAt, not
 * the time at which a delayed webhook is eventually delivered or replayed.
 */
async function onCompleted(
  session: Stripe.Checkout.Session,
  paymentCompletedAt: Date,
) {
  if (session.payment_status !== "paid") return;

  const appointmentId = session.metadata?.appointmentId;
  if (!appointmentId) return;

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { treatment: true, patient: true, payment: true },
  });

  if (!appt) return;

  // A prior successful processing may have committed before the confirmation
  // email was sent. Resume only that unfinished email step.
  if (appt.status === "CONFIRMED" || appt.status === "COMPLETED") {
    if (appt.payment?.status === STATUS_PAID) {
      await sendConfirmationIfNeeded(appointmentId);
    }
    return;
  }

  if (!appt.payment) {
    throw new Error(
      `No local payment record exists for appointment ${appointmentId}`,
    );
  }

  // Never change a payment back to PAID after a refund was started or completed.
  // This also makes replaying the already-refunded test event safe.
  if (
    appt.payment.status === STATUS_REFUNDED ||
    appt.payment.status === STATUS_REFUND_PENDING ||
    appt.payment.status === STATUS_REFUND_FAILED ||
    Boolean(appt.payment.stripeRefundId)
  ) {
    return;
  }

  // A webhook for an old Checkout Session must not update a newer payment.
  if (appt.payment.stripeSessionId !== session.id) {
    throw new Error(
      `Checkout Session ${session.id} does not match the stored payment session for appointment ${appointmentId}`,
    );
  }

  if (
    session.amount_total !== null &&
    session.amount_total !== undefined &&
    session.amount_total !== appt.payment.amount
  ) {
    throw new Error("Checkout session amount does not match local payment amount");
  }

  if (
    session.currency &&
    appt.payment.currency &&
    session.currency.toLowerCase() !== appt.payment.currency.toLowerCase()
  ) {
    throw new Error("Checkout session currency does not match local payment currency");
  }

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const isRecoverableHoldCancellation =
    isRecoverableExpiredHoldCancellation(appt, paymentCompletedAt);
  const isCancelledForAnotherReason =
    appt.status === "CANCELLED" && !isRecoverableHoldCancellation;
  const paymentCompletedAfterHold = Boolean(
    appt.holdExpiresAt &&
      paymentCompletedAt.getTime() > appt.holdExpiresAt.getTime(),
  );

  // Verify that no other confirmed appointment occupies this time interval.
  const clash = await prisma.appointment.findFirst({
    where: {
      id: { not: appointmentId },
      status: "CONFIRMED",
      startTime: { lt: appt.endTime },
      endTime: { gt: appt.startTime },
    },
  });
  // Keep the ID guard as a defensive check (and for mocked Prisma results):
  // the query excludes this appointment, but never treat it as its own conflict.
  const isClash = Boolean(clash && clash.id !== appointmentId);

  const isConflict =
    isCancelledForAnotherReason || paymentCompletedAfterHold || isClash;

  if (isConflict) {
    let refundStatus: PaymentStatus = STATUS_REFUND_FAILED;
    let refundId: string | null = null;
    let refundFailureReason: string | null = null;

    if (!paymentIntent) {
      refundFailureReason = "Missing Stripe payment intent; automatic refund could not be created";
    } else {
      // Reusing this idempotency key makes a webhook retry return the same refund
      // rather than issuing another refund for this Checkout Session.
      const refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntent,
          metadata: {
            appointmentId,
            reason: "booking_conflict",
          },
        },
        { idempotencyKey: `booking-conflict-refund-${session.id}` },
      );

      refundId = refund.id;
      if (refund.status === "succeeded") {
        refundStatus = STATUS_REFUNDED;
      } else if (refund.status === "failed" || refund.status === "canceled") {
        refundStatus = STATUS_REFUND_FAILED;
        refundFailureReason = refund.failure_reason ?? "Refund failed";
      } else {
        refundStatus = STATUS_REFUND_PENDING;
      }
    }

    const conflictReason = isCancelledForAnotherReason
      ? "Appointment was cancelled before payment confirmation"
      : paymentCompletedAfterHold
        ? "Payment completed after the booking hold expired"
        : "The appointment time is no longer available";

    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "CANCELLED",
          ...(appt.status !== "CANCELLED"
            ? { cancelledAt: new Date(), cancelReason: conflictReason }
            : {}),
        },
      });

      const paymentUpdate = await tx.payment.updateMany({
        where: {
          appointmentId,
          stripeSessionId: session.id,
        },
        data: {
          status: refundStatus,
          stripePaymentIntentId: paymentIntent,
          stripeRefundId: refundId,
          refundedAt:
            refundStatus === STATUS_REFUNDED ? new Date() : null,
          failureReason: refundFailureReason,
        },
      });

      if (paymentUpdate.count !== 1) {
        throw new Error(
          `Could not update the matching payment for appointment ${appointmentId}`,
        );
      }
    });

    if (refundStatus === STATUS_REFUND_FAILED) {
      await notify(
        sendDentistNotification(
          noticeFor("REFUND_FAILED", appt, {
            note:
              refundFailureReason ??
              "Booking conflict refund failed. Retry it from the owner dashboard.",
          }),
        ),
      );
    }

    return;
  }

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CONFIRMED",
        holdExpiresAt: null,
        meetLink: null,
        ...(isRecoverableHoldCancellation
          ? { cancelledAt: null, cancelReason: null }
          : {}),
      },
    });

    const payment = await tx.payment.update({
      where: { appointmentId },
      data: {
        status: STATUS_PAID,
        paidAt: paymentCompletedAt,
        stripePaymentIntentId: paymentIntent,
        failureReason: null,
      },
    });

    const count =
      typeof tx.invoice?.count === "function"
        ? await tx.invoice.count()
        : typeof prisma.invoice?.count === "function"
          ? await prisma.invoice.count()
          : 0;

    return tx.invoice.create({
      data: {
        paymentId: payment.id,
        number: `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`,
      },
    });
  });

  // Calendar provisioning runs after the payment/appointment transaction commits. If Google
  // is temporarily unavailable, the confirmed payment remains intact and webhook replay retries it.
  const meetLink = appt.consultationType === "VIDEO"
    ? await ensureMeetLinkForAppointment(appointmentId)
    : null;

  await notify(
    sendDentistNotification(
      noticeFor("NEW_BOOKING", appt, {
        note: `Invoice: ${invoice.number}`,
      }),
    ),
  );

  try {
    const sent = await sendBookingConfirmation(appt.patient.email, {
      name: appt.patient.name,
      treatment: appt.treatment.name,
      whenText: new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: env.CLINIC_TIMEZONE,
      }).format(appt.startTime),
      location: env.CLINIC_ADDRESS,
      meetLink,
      invoiceNo: invoice.number,
    });

    if (sent) {
      await prisma.invoice.updateMany({
        where: { paymentId: invoice.paymentId, emailSentAt: null },
        data: { emailSentAt: new Date() },
      });
    }
  } catch (error) {
    console.error(
      "Confirmation email failed; Stripe webhook should retry",
      error,
    );
    throw error;
  }
}

/** Retry confirmation email for a paid, confirmed appointment when not yet recorded as sent. */
async function sendConfirmationIfNeeded(appointmentId: string): Promise<void> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      treatment: true,
      payment: { include: { invoice: true } },
    },
  });

  const meetLink = appt?.consultationType === "VIDEO"
    ? await ensureMeetLinkForAppointment(appointmentId)
    : null;
  const payment = appt?.payment;
  const invoice = payment?.invoice;

  if (
    !appt ||
    !payment ||
    !invoice ||
    invoice.emailSentAt ||
    (appt.status !== "CONFIRMED" && appt.status !== "COMPLETED") ||
    payment.status !== STATUS_PAID
  ) {
    return;
  }

  const sent = await sendBookingConfirmation(appt.patient.email, {
    name: appt.patient.name,
    treatment: appt.treatment.name,
    whenText: new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: env.CLINIC_TIMEZONE,
    }).format(appt.startTime),
    location: env.CLINIC_ADDRESS,
    meetLink: meetLink ?? appt.meetLink,
    invoiceNo: invoice.number,
  });

  if (sent) {
    await prisma.invoice.updateMany({
      where: { paymentId: invoice.paymentId, emailSentAt: null },
      data: { emailSentAt: new Date() },
    });
  }
}

async function onChargeRefunded(charge: Stripe.Charge) {
  const appointmentId = charge.metadata?.appointmentId;
  const paymentIntent =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntent) return;

  const where: Prisma.PaymentWhereInput = {
    stripePaymentIntentId: paymentIntent,
    status: STATUS_REFUND_PENDING,
  };
  if (appointmentId) where.appointmentId = appointmentId;

  await prisma.payment.updateMany({
    where,
    data: {
      status: STATUS_REFUNDED,
      refundedAt: new Date(),
    },
  });
}

async function onRefundUpdated(refund: Stripe.Refund) {
  const appointmentId = refund.metadata?.appointmentId;
  const paymentIntent =
    typeof refund.payment_intent === "string"
      ? refund.payment_intent
      : refund.payment_intent?.id;

  if (!paymentIntent) return;

  if (refund.status === "failed" || refund.status === "canceled") {
    await prisma.payment.updateMany({
      where: {
        ...(appointmentId ? { appointmentId } : {}),
        stripePaymentIntentId: paymentIntent,
        status: STATUS_REFUND_PENDING,
      },
      data: {
        status: STATUS_REFUND_FAILED,
        failureReason: refund.failure_reason ?? "Refund failed",
      },
    });
  } else if (refund.status === "succeeded") {
    await prisma.payment.updateMany({
      where: {
        ...(appointmentId ? { appointmentId } : {}),
        stripePaymentIntentId: paymentIntent,
        status: STATUS_REFUND_PENDING,
      },
      data: {
        status: STATUS_REFUNDED,
        refundedAt: new Date(),
        failureReason: null,
      },
    });
  }
}

async function onRefundFailed(refund: Stripe.Refund) {
  const appointmentId = refund.metadata?.appointmentId;
  const paymentIntent =
    typeof refund.payment_intent === "string"
      ? refund.payment_intent
      : refund.payment_intent?.id;

  if (!paymentIntent) return;

  await prisma.payment.updateMany({
    where: {
      ...(appointmentId ? { appointmentId } : {}),
      stripePaymentIntentId: paymentIntent,
      status: { in: [STATUS_REFUND_PENDING, STATUS_REFUNDED] },
    },
    data: {
      status: STATUS_REFUND_FAILED,
      failureReason: refund.failure_reason ?? "Refund failed",
    },
  });
}