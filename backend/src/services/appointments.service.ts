import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { HttpError } from "../middleware/errors";
import { notify, sendDentistNotification, sendPatientNotification } from "./email.service";
import { expireCheckoutSession, noticeFor, refundPaymentForAppointment } from "./payments.service";
import { addMin, clinicDateForInstant, getFreeSlots } from "./slots.service";
import type { CreateAppointmentBody } from "../validators/appointments.schema";

export const HOLD_MINUTES = 10;

/** Create a PENDING appointment and hold the slot for ten minutes, without charging payment. */
export async function createPendingAppointment(patientId: string, input: CreateAppointmentBody) {
  const treatment = await prisma.treatment.findFirst({
    where: { id: input.treatmentId, active: true },
    select: { id: true, durationMin: true },
  });
  if (!treatment) throw new HttpError(404, "NOT_FOUND", "Treatment not found");

  const start = new Date(input.startTime);
  if (Number.isNaN(start.getTime())) {
    throw new HttpError(422, "VALIDATION_ERROR", "Invalid startTime");
  }
  const end = addMin(start, treatment.durationMin);
  const clinicDate = clinicDateForInstant(start);

  // Ensure the requested timestamp is an exact slot the public API currently offers.
  const offered = await getFreeSlots(clinicDate, treatment.id);
  if (!offered.some((slot) => slot.start === start.toISOString())) {
    throw new HttpError(409, "SLOT_TAKEN", "That slot is no longer available");
  }

  // Re-check the overlap inside a SERIALIZABLE transaction to reduce double-booking races.
  return prisma.$transaction(
    async (tx) => {
      const now = new Date();
      const clash = await tx.appointment.findFirst({
        where: {
          startTime: { lt: end },
          endTime: { gt: start },
          OR: [
            { status: "CONFIRMED" },
            { status: "PENDING", holdExpiresAt: { gt: now } },
          ],
        },
        select: { id: true },
      });
      if (clash) throw new HttpError(409, "SLOT_TAKEN", "That slot was just taken");

      return tx.appointment.create({
        data: {
          patientId,
          treatmentId: treatment.id,
          startTime: start,
          endTime: end,
          consultationType: input.consultationType,
          isNewPatient: input.isNewPatient,
          status: "PENDING",
          holdExpiresAt: addMin(now, HOLD_MINUTES),
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}

/** Mark PENDING holds as cancelled after their expiration time. Safe to run repeatedly. */
export async function releaseExpiredHolds(now: Date = new Date()): Promise<number> {
  const result = await prisma.appointment.updateMany({
    where: {
      status: "PENDING",
      holdExpiresAt: { lte: now },
    },
    data: { status: "CANCELLED" },
  });
  return result.count;
}

const hoursUntil = (start: Date, now: Date) => (start.getTime() - now.getTime()) / 3_600_000;

/** Load an appointment owned by this patient (404 for someone else's, so IDs cannot be probed). */
async function loadOwned(patientId: string, appointmentId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId },
    include: { patient: true, treatment: true, payment: true },
  });
  if (!appt) throw new HttpError(404, "NOT_FOUND", "Appointment not found");
  return appt;
}

type LoadedAppointment = Awaited<ReturnType<typeof loadOwned>>;

/** Shared cancel flow for patient and owner: free the slot first, then refund, then notify. */
async function performCancel(appt: LoadedAppointment, actor: "PATIENT" | "OWNER", reason: string | undefined, now: Date) {
  // The status guard makes a double-click or concurrent cancel a no-op instead of a double refund.
  const { count } = await prisma.appointment.updateMany({
    where: { id: appt.id, status: appt.status },
    data: { status: "CANCELLED", cancelledAt: now, cancelReason: reason ?? null, cancelledBy: actor, holdExpiresAt: null },
  });
  if (count === 0) throw new HttpError(409, "NOT_CANCELLABLE", "This appointment was already changed. Refresh and try again.");

  // An unpaid hold may still have an open Stripe Checkout page: close it so it cannot be paid afterwards.
  if (appt.status === "PENDING" && appt.payment?.stripeSessionId) await expireCheckoutSession(appt.payment.stripeSessionId);

  const refundStatus = appt.payment?.status === "PAID"? await refundPaymentForAppointment(appt.id, actor === "OWNER" ? "clinic_cancelled" : "patient_cancelled"): null;

  const notice = noticeFor("CANCELLED", appt, { reason, note: actor === "OWNER" ? "Cancelled by the clinic." : undefined });
  const refundFailed = refundStatus === "REFUND_FAILED";
  await notify(
    sendDentistNotification(refundFailed ? { ...notice, note: "The automatic refund FAILED. Please retry it from the owner dashboard." } : notice),
    sendPatientNotification(refundFailed ? { ...notice, event: "REFUND_FAILED" } : notice),
  );
  return { id: appt.id, status: "CANCELLED" as const, refundStatus };
}

/**
 * Patient cancels an appointment.
 * - PENDING holds can always be cancelled (nothing was paid).
 * - CONFIRMED visits can be cancelled up to CANCEL_CUTOFF_HOURS before the start; the booking fee is refunded.
 */
export async function cancelAppointment(patientId: string, appointmentId: string, reason?: string, now: Date = new Date()) {
  const appt = await loadOwned(patientId, appointmentId);
  if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") {
    throw new HttpError(409, "NOT_CANCELLABLE", `A ${appt.status.toLowerCase().replace("_", " ")} appointment cannot be cancelled`);
  }
  if (appt.status === "CONFIRMED" && hoursUntil(appt.startTime, now) < env.CANCEL_CUTOFF_HOURS) {
    throw new HttpError(409, "TOO_LATE", `Appointments can only be cancelled at least ${env.CANCEL_CUTOFF_HOURS} hours before the visit. Please call the clinic.`);
  }
  return performCancel(appt, "PATIENT", reason, now);
}

/** Clinic cancels any upcoming appointment (e.g. dentist unavailable). No cutoff; paid fees are always refunded. */
export async function cancelAppointmentAsOwner(appointmentId: string, reason?: string, now: Date = new Date()) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, treatment: true, payment: true },
  });
  if (!appt) throw new HttpError(404, "NOT_FOUND", "Appointment not found");
  if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") {
    throw new HttpError(409, "NOT_CANCELLABLE", `A ${appt.status.toLowerCase().replace("_", " ")} appointment cannot be cancelled`);
  }
  return performCancel(appt, "OWNER", reason, now);
}

/**
 * Move a CONFIRMED appointment to a new slot, keeping the existing payment.
 * The new slot is validated exactly like a fresh booking, ignoring the appointment's own current slot.
 */
export async function rescheduleAppointment(
  patientId: string,
  appointmentId: string,
  newStartTime: string,
  now: Date = new Date(),
) {
  const appt = await loadOwned(patientId, appointmentId);
  if (appt.status !== "CONFIRMED") throw new HttpError(409, "NOT_RESCHEDULABLE", "Only confirmed appointments can be rescheduled");
  if (hoursUntil(appt.startTime, now) < env.CANCEL_CUTOFF_HOURS) {
    throw new HttpError(409, "TOO_LATE", `Appointments can only be rescheduled at least ${env.CANCEL_CUTOFF_HOURS} hours before the visit. Please call the clinic.`);
  }
  if (appt.rescheduleCount >= env.MAX_RESCHEDULES) {
    throw new HttpError(409, "RESCHEDULE_LIMIT", `You can reschedule an appointment at most ${env.MAX_RESCHEDULES} times. Please call the clinic.`);
  }

  const start = new Date(newStartTime);
  if (Number.isNaN(start.getTime())) throw new HttpError(422, "VALIDATION_ERROR", "Invalid startTime");
  if (start.getTime() === appt.startTime.getTime()) throw new HttpError(422, "SAME_SLOT", "Please choose a different time");
  const end = addMin(start, appt.treatment.durationMin);

  const offered = await getFreeSlots(clinicDateForInstant(start), appt.treatmentId, now, appt.id);
  if (!offered.some((slot) => slot.start === start.toISOString())) {
    throw new HttpError(409, "SLOT_TAKEN", "That slot is no longer available");
  }

  const updated = await prisma.$transaction(
    async (tx) => {
      const clash = await tx.appointment.findFirst({
        where: {
          id: { not: appt.id },
          startTime: { lt: end },
          endTime: { gt: start },
          OR: [{ status: "CONFIRMED" }, { status: "PENDING", holdExpiresAt: { gt: now } }],
        },
        select: { id: true },
      });
      if (clash) throw new HttpError(409, "SLOT_TAKEN", "That slot was just taken");

      // Guarded on the old start time so two concurrent reschedules cannot both win.
      const res = await tx.appointment.updateMany({
        where: { id: appt.id, status: "CONFIRMED", startTime: appt.startTime },
        data: { startTime: start, endTime: end, rescheduleCount: { increment: 1 } },
      });
      if (res.count === 0) throw new HttpError(409, "CONFLICT", "This appointment was already changed. Refresh and try again.");
      return tx.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    },
    { isolationLevel: "Serializable" },
  );

  const notice = noticeFor("RESCHEDULED", { ...appt, startTime: updated.startTime }, { previousStart: appt.startTime });
  await notify(sendDentistNotification(notice), sendPatientNotification(notice));

  return { id: updated.id, status: updated.status, startTime: updated.startTime, endTime: updated.endTime, rescheduleCount: updated.rescheduleCount };
}
