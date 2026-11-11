import rateLimit from "express-rate-limit";

const base = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later", code: "RATE_LIMITED" },
};

/** Light limit for the whole API. */
export const apiLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 300 });

/** Contact form: 5 messages per 15 minutes per IP. */
export const contactLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 5 });

/** Authentication endpoints: protect login and registration from high-volume abuse. */
export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 10 });

/** Public AI chat: 10 requests per minute per IP to reduce abuse and cost spikes. */
export const aiChatLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 10 });
