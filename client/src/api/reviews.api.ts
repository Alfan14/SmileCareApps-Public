import type { Review } from "../types/api";
import { api } from "./client";

export const getReviews = (limit = 12) => api<Review[]>(`/reviews?limit=${limit}`);

export type ReviewInput = { appointmentId: string; rating: number; comment: string };

/** Patient reviews a completed visit. The review is shown publicly once the clinic approves it. */
export const submitReview = (body: ReviewInput) => api<{ message: string }>("/reviews", { method: "POST", body: JSON.stringify(body) });
