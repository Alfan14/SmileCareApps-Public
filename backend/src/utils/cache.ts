import type { Response } from "express";
import { env } from "../config/env";

/** Lets browsers and CDNs cache public content briefly. Disabled outside production so edits show immediately. */
export function cachePublic(res: Response, seconds = 60) {
  if (env.NODE_ENV === "production") res.set("Cache-Control", `public, max-age=${seconds}`);
}
