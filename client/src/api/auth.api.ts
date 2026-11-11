import type { User } from "../types/api";
import { api } from "./client";
import type { ApiError } from "./client";

export type RegisterPayload = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};
export type LoginPayload = { email: string; password: string };

const json = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});

export const registerAccount = (body: RegisterPayload) =>
  api<{ user: User }>("/auth/register", json(body)).then((r) => r.user);

export const loginAccount = (body: LoginPayload) =>
  api<{ user: User }>("/auth/login", json(body)).then((r) => r.user);

export const logoutAccount = () =>
  api<void>("/auth/logout", { method: "POST" });

/** The logged-in user, or null when nobody is logged in (HTTP 401 is normal here, not an error). */
export async function getMe(): Promise<User | null> {
  try {
    return (await api<{ user: User }>("/auth/me")).user;
  } catch (err) {
    if ((err as ApiError).status === 401) return null;
    throw err;
  }
}
