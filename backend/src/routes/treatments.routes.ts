import { Router } from "express";
import * as controller from "../controllers/treatments.controller";
import { validate } from "../middleware/errors";
import { treatmentParams } from "../validators/treatments.schema";

export const treatmentsRouter = Router();

treatmentsRouter.get("/", controller.list);
treatmentsRouter.get("/:idOrSlug", validate(treatmentParams, "params"), controller.getOne);
