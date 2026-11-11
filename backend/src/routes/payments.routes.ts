import { Router } from "express";
import * as controller from "../controllers/payments.controller";
import { authenticate, originCheck, requireRole } from "../middleware/auth.middleware";
import { validate } from "../middleware/errors";
import { checkoutSchema } from "../validators/payments.schema";

export const paymentsRouter = Router();

paymentsRouter.post("/checkout", originCheck, authenticate, requireRole("PATIENT"), validate(checkoutSchema), controller.createCheckout);
paymentsRouter.get("/appointments/:appointmentId", authenticate, requireRole("PATIENT"), controller.paymentStatus);
