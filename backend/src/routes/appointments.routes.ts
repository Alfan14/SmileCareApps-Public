import { Router } from "express";
import * as controller from "../controllers/appointments.controller";
import { authenticate, originCheck, requireRole } from "../middleware/auth.middleware";
import { validate } from "../middleware/errors";
import {
  appointmentIdParamsSchema,
  cancelAppointmentSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
} from "../validators/appointments.schema";

export const appointmentsRouter = Router();
appointmentsRouter.post("/", originCheck, authenticate, requireRole("PATIENT"), validate(createAppointmentSchema), controller.create);
appointmentsRouter.post("/:id/cancel", originCheck, authenticate, requireRole("PATIENT"), validate(appointmentIdParamsSchema, "params"), validate(cancelAppointmentSchema), controller.cancel);
appointmentsRouter.post("/:id/reschedule", originCheck, authenticate, requireRole("PATIENT"), validate(appointmentIdParamsSchema, "params"), validate(rescheduleAppointmentSchema), controller.reschedule);
