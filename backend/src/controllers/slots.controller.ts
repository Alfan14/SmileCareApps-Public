import type { Request, Response } from "express";
import { getFreeSlots } from "../services/slots.service";

export async function list(_req: Request, res: Response) {
  const { date, treatmentId } = res.locals.query as { date: string; treatmentId: string };
  const slots = await getFreeSlots(date, treatmentId);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ date, treatmentId, slots });
}
