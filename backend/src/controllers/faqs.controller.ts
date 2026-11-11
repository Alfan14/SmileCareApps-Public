import type { Request, Response } from "express";
import { listFaqs } from "../services/faqs.service";
import { cachePublic } from "../utils/cache";

export async function list(_req: Request, res: Response) {
  const { category } = res.locals.query as { category?: string };
  cachePublic(res);
  res.json(await listFaqs(category));
}
