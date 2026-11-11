import { Router } from "express";
import { aiRouter } from "./ai.routes";
import { ownerAiRouter } from "./owner-ai.routes";
import { appointmentsRouter } from "./appointments.routes";
import { authRouter } from "./auth.routes";
import { contactRouter } from "./contact.routes";
import { faqsRouter } from "./faqs.routes";
import { reviewsRouter } from "./reviews.routes";
import { paymentsRouter } from "./payments.routes";
import { patientDashboardRouter } from "./patient-dashboard.routes";
import { ownerDashboardRouter } from "./owner-dashboard.routes";
import { slotsRouter } from "./slots.routes";
import { treatmentsRouter } from "./treatments.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/treatments", treatmentsRouter);
apiRouter.use("/faqs", faqsRouter);
apiRouter.use("/reviews", reviewsRouter);
apiRouter.use("/contact", contactRouter);
apiRouter.use("/slots", slotsRouter);
apiRouter.use("/appointments", appointmentsRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/patient", patientDashboardRouter);
apiRouter.use("/owner", ownerDashboardRouter);
apiRouter.use("/owner/ai", ownerAiRouter);
apiRouter.use("/ai", aiRouter);
