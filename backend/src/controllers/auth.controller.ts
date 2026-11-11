import type { Request, Response } from "express";
import { endSession, startSession } from "../middleware/auth.middleware";
import { HttpError } from "../middleware/errors";
import { getCurrentUser, loginUser, registerUser } from "../services/auth.service";
import type { LoginBody, RegisterBody } from "../validators/auth.schema";

export async function register(_req: Request, res: Response) {
  const body = res.locals.body as RegisterBody;
  const user = await registerUser(body);
  startSession(res, user);
  res.status(201).json({ user });
}

export async function login(_req: Request, res: Response) {
  const body = res.locals.body as LoginBody;
  const user = await loginUser(body);
  startSession(res, user);
  res.status(200).json({ user });
}

export function logout(_req: Request, res: Response) {
  endSession(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    throw new HttpError(401, "UNAUTHENTICATED", "Please log in");
  }
  const user = await getCurrentUser(userId);
  res.status(200).json({ user });
}
