import type { RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env";
import { HttpError } from "./errors";

export const SESSION_COOKIE = "sc_session";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// This declaration makes the verified session identity available to downstream handlers.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

function isRole(value: unknown): value is Role {
  return value === "PATIENT" || value === "OWNER";
}

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production" || env.CROSS_SITE,
  sameSite: env.CROSS_SITE ? "none" as const : "lax" as const,
  path: "/",
};

export function startSession(res: Response, user: { id: string; role: Role }) {
  const token = jwt.sign({ role: user.role }, env.SESSION_SECRET, {
    subject: user.id,
    expiresIn: "7d",
    issuer: "smilecare-api",
    audience: "smilecare-client",
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: WEEK_MS });
}

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next(new HttpError(401, "UNAUTHENTICATED", "Please log in"));

  try {
    const payload = jwt.verify(token, env.SESSION_SECRET, {
      issuer: "smilecare-api",
      audience: "smilecare-client",
    });
    if (typeof payload === "string" || typeof payload.sub !== "string" || !payload.sub || !isRole(payload.role)) {
      return next(new HttpError(401, "UNAUTHENTICATED", "Session is invalid. Please log in again"));
    }
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, "UNAUTHENTICATED", "Session expired or invalid. Please log in again"));
  }
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) =>
    req.user && roles.includes(req.user.role)
      ? next()
      : next(new HttpError(403, "FORBIDDEN", "You are not allowed to do this"));

// CSRF defence in depth for state-changing browser requests.
export const originCheck: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && origin !== env.CLIENT_URL) return next(new HttpError(403, "BAD_ORIGIN", "Origin not allowed"));
  next();
};
