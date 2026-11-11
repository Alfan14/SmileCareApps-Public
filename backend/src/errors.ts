// TARGET: server/src/middleware/errors.ts  (HttpError can live in utils/httpError.ts if you prefer)
import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, _res, next) =>
  next(new HttpError(404, "NOT_FOUND", "Route not found"));

// Express 5 makes req.query read-only, so validated data goes to res.locals.<source>.
// Controllers read res.locals.body / res.locals.query / res.locals.params.
export const validate =
  (schema: ZodSchema, source: "body" | "query" | "params" = "body"): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    res.locals[source] = result.data;
    next();
  };

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "Invalid input",
      code: "VALIDATION_ERROR",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, code: err.code });
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2034") return res.status(409).json({ error: "That slot was just taken", code: "SLOT_TAKEN" });
    if (err.code === "P2002") return res.status(409).json({ error: "Already exists", code: "CONFLICT" });
  }
  console.error(err);
  res.status(500).json({
    error: env.NODE_ENV === "production" ? "Something went wrong" : String(err?.message ?? err),
    code: "INTERNAL",
  });
};
