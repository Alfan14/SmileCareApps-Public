import type { Request, Response } from "express";
import { HttpError } from "../middleware/errors";
import { cancelAppointment, createPendingAppointment, rescheduleAppointment } from "../services/appointments.service";
import type { CreateAppointmentBody } from "../validators/appointments.schema";

export async function create(req: Request, res: Response) {
  const patientId = req.user?.id;
  if (!patientId) throw new HttpError(401, "UNAUTHENTICATED", "Please log in");

  const body = res.locals.body as CreateAppointmentBody;
  const appointment = await createPendingAppointment(patientId, body);
  res.status(201).json({
    message: "Booking hold created. Complete payment in the payments sprint.",
    appointment: {
      id: appointment.id,
      treatmentId: appointment.treatmentId,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      consultationType: appointment.consultationType,
      status: appointment.status,
      isNewPatient: appointment.isNewPatient,
      holdExpiresAt: appointment.holdExpiresAt,
      createdAt: appointment.createdAt,
    },
  });
}

function requirePatient(req: Request): string {
  if (!req.user?.id) throw new HttpError(401, "UNAUTHENTICATED", "Please log in");
  return req.user.id;
}

export async function cancel(req: Request, res: Response) {
  const { id } = res.locals.params as { id: string };
  const { reason } = res.locals.body as { reason?: string };
  res.json({ message: "Appointment cancelled", ...(await cancelAppointment(requirePatient(req), id, reason)) });
}

export async function reschedule(req: Request, res: Response) {
  const { id } = res.locals.params as { id: string };
  const { startTime } = res.locals.body as { startTime: string };
  res.json({ message: "Appointment rescheduled", appointment: await rescheduleAppointment(requirePatient(req), id, startTime) });
}
