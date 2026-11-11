import { Router } from "express";
import * as controller from "../controllers/faqs.controller";
import { validate } from "../middleware/errors";
import { faqsQuery } from "../validators/faqs.schema";

export const faqsRouter = Router();

faqsRouter.get("/", validate(faqsQuery, "query"), controller.list);
