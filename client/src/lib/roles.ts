import type { Role } from "../types/api";

/** Where each role lands after logging in. */
export const homeFor = (role: Role) => (role === "OWNER" ? "/owner" : "/patient");

/**
 * Reads the page the visitor wanted before being sent to /login (see ProtectedRoute).
 * Only same-site paths are accepted, so a crafted link cannot send people to another website.
 */
export function safeRedirect(state: unknown): string | null {
  const from = (state as { from?: { pathname?: unknown } } | null)?.from?.pathname;
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : null;
}
