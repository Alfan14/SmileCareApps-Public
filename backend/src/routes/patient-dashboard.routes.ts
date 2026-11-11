import { Router } from "express";
import * as controller from "../controllers/patient-dashboard.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { validate } from "../middleware/errors";
import { patientAppointmentsQuerySchema, patientIdParamsSchema, patientListQuerySchema, recordIdParamsSchema } from "../validators/patient-dashboard.schema";

export const patientDashboardRouter = Router();
patientDashboardRouter.use(authenticate, requireRole("PATIENT"));
patientDashboardRouter.get("/dashboard", controller.dashboard);
patientDashboardRouter.get("/appointments", validate(patientAppointmentsQuerySchema, "query"), controller.appointments);
patientDashboardRouter.get("/records", validate(patientListQuerySchema, "query"), controller.records);
patientDashboardRouter.get("/prescriptions", validate(patientListQuerySchema, "query"), controller.prescriptions);
patientDashboardRouter.get("/invoices", validate(patientListQuerySchema, "query"), controller.invoices);
patientDashboardRouter.get("/invoices/:invoiceId", validate(patientIdParamsSchema, "params"), controller.invoiceDetail);
patientDashboardRouter.get("/records/:recordId/pdf", validate(recordIdParamsSchema, "params"), controller.recordPdf);
