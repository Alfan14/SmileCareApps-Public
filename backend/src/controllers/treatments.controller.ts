import type { Request, Response } from "express";
import * as treatments from "../services/treatments.service";
import { cachePublic } from "../utils/cache";

export async function list(_req: Request, res: Response) {
  cachePublic(res);
  res.json(await treatments.listTreatments());
}

export async function getOne(_req: Request, res: Response) {
  const { idOrSlug } = res.locals.params as { idOrSlug: string };
  cachePublic(res);
  res.json(await treatments.getTreatment(idOrSlug));
}
