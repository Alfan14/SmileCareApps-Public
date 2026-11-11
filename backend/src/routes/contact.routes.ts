import { Router } from "express";
import * as controller from "../controllers/contact.controller";
import { validate } from "../middleware/errors";
import { contactLimiter } from "../middleware/rateLimit";
import { contactSchema } from "../validators/contact.schema";

export const contactRouter = Router();

contactRouter.post("/", contactLimiter, validate(contactSchema, "body"), controller.create);
