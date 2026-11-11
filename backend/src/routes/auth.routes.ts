import { Router } from "express";
import * as controller from "../controllers/auth.controller";
import { authenticate, originCheck } from "../middleware/auth.middleware";
import { validate } from "../middleware/errors";
import { authLimiter } from "../middleware/rateLimit";
import { loginSchema, registerSchema } from "../validators/auth.schema";

export const authRouter = Router();

authRouter.post("/register", authLimiter, originCheck, validate(registerSchema), controller.register);
authRouter.post("/login", authLimiter, originCheck, validate(loginSchema), controller.login);
authRouter.post("/logout", originCheck, controller.logout);
authRouter.get("/me", authenticate, controller.me);
