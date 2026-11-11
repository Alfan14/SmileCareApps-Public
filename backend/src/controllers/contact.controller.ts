import type { Request, Response } from "express";
import { saveContactMessage } from "../services/contact.service";
import type { ContactBody } from "../validators/contact.schema";

export async function create(_req: Request, res: Response) {
  const body = res.locals.body as ContactBody;
  // Honeypot: bots fill the hidden field. Pretend success and store nothing.
  if (body.website) {
    res.status(201).json({ ok: true });
    return;
  }
  await saveContactMessage(body);
  res.status(201).json({ ok: true });
}
