import type { ContactInput } from "../lib/validators";
import { api } from "./client";

export const sendContact = (body: ContactInput) =>
  api<{ ok: true }>("/contact", { method: "POST", body: JSON.stringify(body) });
