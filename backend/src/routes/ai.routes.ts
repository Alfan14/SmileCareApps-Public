import { Router } from "express";
import * as controller from "../controllers/ai.controller";
import { originCheck } from "../middleware/auth.middleware";
import { validate } from "../middleware/errors";
import { aiChatLimiter } from "../middleware/rateLimit";
import { aiChatSchema } from "../validators/ai.schema";

export const aiRouter = Router();
aiRouter.post(
  "/chat",
  aiChatLimiter,
  originCheck,
  validate(aiChatSchema),
  controller.chat,
);
