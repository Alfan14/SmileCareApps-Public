import { Router } from "express";
import * as controller from "../controllers/slots.controller";
import { validate } from "../middleware/errors";
import { slotsQuerySchema } from "../validators/slots.schema";

export const slotsRouter = Router();
slotsRouter.get("/", validate(slotsQuerySchema, "query"), controller.list);
