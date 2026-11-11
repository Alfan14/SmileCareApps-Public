import type { AiProvider, AiSettings, AiTestResult, ChatReply } from "../types/api";
import { isObj, str, sub } from "./raw";
import type { Raw } from "./raw";

// Accepts a few reasonable shapes for the AI answers, so a small difference on the server does not break the UI.

const PROVIDERS: AiProvider[] = ["mock", "gemini", "openai"];
const toProvider = (v: unknown): AiProvider | null => (typeof v === "string" && (PROVIDERS as string[]).includes(v.toLowerCase()) ? (v.toLowerCase() as AiProvider) : null);

/** { reply } or { message } / { answer } / { content } / { text } / { message: { content } } / { data: { reply } } */
export function chatReplyFrom(payload: unknown): ChatReply {
  const raw: Raw = isObj(payload) ? payload : {};
  const reply =
    str(raw.reply) ?? str(raw.message) ?? str(raw.answer) ?? str(raw.content) ?? str(raw.text) ?? str(sub(raw, "message").content) ?? str(sub(raw, "data").reply);
  if (!reply) throw Object.assign(new Error("The assistant sent an empty answer. Please try again."), { status: 502, code: "EMPTY_REPLY" });
  return {
  reply,
  provider: toProvider(raw.provider) ?? toProvider(raw.mode),
};
}

/** { settings: {...} } or the object itself. The key is never present, only a mask or its last 4 characters. */
export function aiSettingsFrom(payload: unknown): AiSettings {
  const wrapped = isObj(payload) && isObj(payload.settings) ? (payload.settings as Raw) : null;
  const raw: Raw = wrapped ?? (isObj(payload) ? payload : {});
  const masked = str(raw.maskedKey) ?? str(raw.apiKeyMasked);
  const keyLast4 = str(raw.keyLast4) ?? (masked ? masked.slice(-4) : null);
  return {
    provider: toProvider(raw.provider) ?? "mock",
    model: str(raw.model) ?? "",
    enabled: raw.enabled !== false,
    hasKey: raw.hasKey === true || keyLast4 !== null,
    keyLast4,
  };
}

export function aiTestFrom(payload: unknown): AiTestResult {
  const raw: Raw = isObj(payload) ? payload : {};
  const ok = raw.ok === true || raw.success === true;
  return { ok, message: str(raw.message) ?? (ok ? "The connection works." : "The connection test failed.") };
}
