import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errors";

/** Approved reviews only. Never exposes patientId. */
export const listReviews = (limit: number) =>
  prisma.review.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, authorName: true, rating: true, comment: true, createdAt: true },
  });

export type SubmitReviewInput = { appointmentId: string; rating: number; comment: string };

/** "Priya Sharma" -> "Priya S." so public reviews do not expose full patient names. */
const displayName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1]!.charAt(0)}.` : first ?? "Patient";
};

/** A patient may review one COMPLETED appointment of their own, once. New reviews wait for owner approval. */
export async function submitReview(patientId: string, input: SubmitReviewInput) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, patientId },
    select: { id: true, status: true, patient: { select: { name: true } }, review: { select: { id: true } } },
  });
  if (!appointment) throw new HttpError(404, "NOT_FOUND", "Appointment not found");
  if (appointment.status !== "COMPLETED") {
    throw new HttpError(409, "NOT_COMPLETED", "You can review an appointment after your visit has been completed");
  }
  if (appointment.review) throw new HttpError(409, "ALREADY_REVIEWED", "You already reviewed this appointment");

  // The unique index on appointmentId turns a concurrent double-submit into a 409 (P2002 -> CONFLICT).
  return prisma.review.create({
    data: {
      patientId,
      appointmentId: appointment.id,
      authorName: displayName(appointment.patient.name),
      rating: input.rating,
      comment: input.comment,
      approved: false,
    },
    select: { id: true, rating: true, comment: true, approved: true, createdAt: true },
  });
}

/** Owner moderation queue. */
export const listReviewsForOwner = (approved?: boolean) =>
  prisma.review.findMany({
    where: approved === undefined ? {} : { approved },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, authorName: true, rating: true, comment: true, approved: true, createdAt: true,
      appointment: { select: { id: true, startTime: true, treatment: { select: { name: true } } } },
    },
  });

export async function setReviewApproved(id: string, approved: boolean) {
  const { count } = await prisma.review.updateMany({ where: { id }, data: { approved } });
  if (count === 0) throw new HttpError(404, "NOT_FOUND", "Review not found");
  return { id, approved };
}
