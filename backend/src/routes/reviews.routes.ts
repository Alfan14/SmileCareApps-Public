import { Router } from "express";
import * as controller from "../controllers/reviews.controller";
import { authenticate, originCheck, requireRole } from "../middleware/auth.middleware";
import { validate } from "../middleware/errors";
import { moderateReviewSchema, ownerReviewsQuery, reviewIdParamsSchema, reviewsQuery, submitReviewSchema } from "../validators/reviews.schema";

export const reviewsRouter = Router();

// Public: approved reviews only.
reviewsRouter.get("/", validate(reviewsQuery, "query"), controller.list);
// Patient: review a completed appointment (one per appointment, pending approval).
reviewsRouter.post("/", originCheck, authenticate, requireRole("PATIENT"), validate(submitReviewSchema), controller.create);

// Owner: moderation.
reviewsRouter.get("/owner", authenticate, requireRole("OWNER"), validate(ownerReviewsQuery, "query"), controller.ownerList);
reviewsRouter.patch("/owner/:id", originCheck, authenticate, requireRole("OWNER"), validate(reviewIdParamsSchema, "params"), validate(moderateReviewSchema), controller.moderate);
