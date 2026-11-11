import { Router } from "express";
import * as controller from "../controllers/ai.controller";
import {
  authenticate,
  originCheck,
  requireRole,
} from "../middleware/auth.middleware";
import { validate } from "../middleware/errors";
import { ownerAiSettingsSchema } from "../validators/ai.schema";

export const ownerAiRouter = Router();

ownerAiRouter.use(authenticate, requireRole("OWNER"));

ownerAiRouter.get("/settings", controller.settings);
ownerAiRouter.put(
  "/settings",
  originCheck,
  validate(ownerAiSettingsSchema),
  controller.updateSettings,
);

// Test the currently saved AI configuration.
ownerAiRouter.post(
  "/settings/test",
  originCheck,
  controller.testConnection,
);

ownerAiRouter.get("/usage", controller.usage);