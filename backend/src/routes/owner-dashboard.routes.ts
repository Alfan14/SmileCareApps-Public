import { Router } from "express";
import * as controller from "../controllers/owner-dashboard.controller";
import { authenticate, originCheck, requireRole } from "../middleware/auth.middleware";
import { validate } from "../middleware/errors";
import {
  blockedDateParamsSchema,
  blockedDatesQuerySchema,
  createBlockedDateSchema,
  createOwnerRecordSchema,
  ownerAppointmentParamsSchema,
  ownerAppointmentStatusSchema,
  ownerCancelSchema,
  ownerRecordParamsSchema,
  ownerDashboardQuerySchema,
  ownerRecordQuerySchema,
  ownerPatientsQuerySchema,
  ownerScheduleQuerySchema,
  workingHoursBodySchema,
  workingHoursParamsSchema,
} from "../validators/owner-dashboard.schema";

export const ownerDashboardRouter = Router();
ownerDashboardRouter.use(authenticate, requireRole("OWNER"));
ownerDashboardRouter.get("/dashboard", validate(ownerDashboardQuerySchema, "query"), controller.dashboard);
ownerDashboardRouter.get("/schedule", validate(ownerScheduleQuerySchema, "query"), controller.schedule);
ownerDashboardRouter.get("/working-hours", controller.workingHours);
ownerDashboardRouter.put("/working-hours/:dayOfWeek", originCheck, validate(workingHoursParamsSchema, "params"), validate(workingHoursBodySchema), controller.updateHours);
ownerDashboardRouter.get("/blocked-dates", validate(blockedDatesQuerySchema, "query"), controller.blockedDates);
ownerDashboardRouter.post("/blocked-dates", originCheck, validate(createBlockedDateSchema), controller.createBlocked);
ownerDashboardRouter.delete("/blocked-dates/:date", originCheck, validate(blockedDateParamsSchema, "params"), controller.removeBlocked);
ownerDashboardRouter.get("/patients", validate(ownerPatientsQuerySchema, "query"), controller.patients);
ownerDashboardRouter.get("/records", validate(ownerRecordQuerySchema, "query"), controller.records);
ownerDashboardRouter.post("/records", originCheck, validate(createOwnerRecordSchema), controller.createRecord);
ownerDashboardRouter.patch("/appointments/:id", originCheck, validate(ownerAppointmentParamsSchema, "params"), validate(ownerAppointmentStatusSchema), controller.setOutcome);
ownerDashboardRouter.post("/appointments/:id/cancel", originCheck, validate(ownerAppointmentParamsSchema, "params"), validate(ownerCancelSchema), controller.cancelAppointment);
ownerDashboardRouter.post("/appointments/:id/retry-refund", originCheck, validate(ownerAppointmentParamsSchema, "params"), controller.retryAppointmentRefund);
ownerDashboardRouter.get("/records/:recordId/pdf", validate(ownerRecordParamsSchema, "params"), controller.recordPdf);
