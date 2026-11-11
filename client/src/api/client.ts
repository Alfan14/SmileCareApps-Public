export const BASE = import.meta.env.VITE_API_URL || "/api";

export type ApiError = Error & { code?: string; status?: number };

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error ?? "Request failed"), { code: body.code, status: res.status }) as ApiError;
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
