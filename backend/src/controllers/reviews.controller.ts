import type { Request, Response } from "express";
import { HttpError } from "../middleware/errors";
import { listReviews, listReviewsForOwner, setReviewApproved, submitReview } from "../services/reviews.service";
import type { SubmitReviewInput } from "../services/reviews.service";
import { cachePublic } from "../utils/cache";

export async function list(_req: Request, res: Response) {
  const { limit } = res.locals.query as { limit: number };
  cachePublic(res);
  res.json(await listReviews(limit));
}

export async function create(req: Request, res: Response) {
  if (!req.user?.id) throw new HttpError(401, "UNAUTHENTICATED", "Please log in");
  const review = await submitReview(req.user.id, res.locals.body as SubmitReviewInput);
  res.status(201).json({ message: "Thank you! Your review will appear once the clinic approves it.", review });
}

export async function ownerList(_req: Request, res: Response) {
  const { approved } = res.locals.query as { approved?: boolean };
  res.json({ data: await listReviewsForOwner(approved) });
}

export async function moderate(_req: Request, res: Response) {
  const { id } = res.locals.params as { id: string };
  const { approved } = res.locals.body as { approved: boolean };
  res.json(await setReviewApproved(id, approved));
}
