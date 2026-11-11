import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import type { ZodType } from "zod";
import { env } from "../config/env";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, _res, next) => next(new HttpError(404, "NOT_FOUND", "Route not found"));

// Express 5 makes req.query read-only, so validated data is stored on res.locals.<source>.
// Controllers read res.locals.body / res.locals.query / res.locals.params.
export const validate =
  (schema: ZodType, source: "body" | "query" | "params" = "body"): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    res.locals[source] = result.data;
    next();
  };

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: "Invalid input",
      code: "VALIDATION_ERROR",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  // Prisma errors are recognised by name so this file never needs the generated client at runtime.
  if (err?.name === "PrismaClientKnownRequestError") {
    if (err.code === "P2034") {
      res.status(409).json({ error: "That slot was just taken", code: "SLOT_TAKEN" });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({ error: "Already exists", code: "CONFLICT" });
      return;
    }
  }
  // Postgres exclusion constraint (appointment_no_overlap) is the last line of defence against double booking.
  if (/appointment_no_overlap|23P01/.test(String(err?.message ?? "") + String(err?.code ?? ""))) {
    res.status(409).json({ error: "That slot was just taken", code: "SLOT_TAKEN" });
    return;
  }
  console.error(err);
  res.status(500).json({
    error: env.NODE_ENV === "production" ? "Something went wrong" : String(err?.message ?? err),
    code: "INTERNAL",
  });
};
