import type { ApiError } from "../api/client";
import type { ChatMessage } from "../types/api";

export const MAX_MESSAGE_CHARS = 500; // the server rejects longer messages
export const MAX_HISTORY = 10; // and more than this many in one request

/**
 * The messages to send: the most recent ones, starting with something the user said
 * (some AI providers refuse a conversation that begins with the assistant).
 */
export function historyFor(messages: ChatMessage[]): ChatMessage[] {
  const recent = messages.slice(-MAX_HISTORY);
  const firstUser = recent.findIndex((m) => m.role === "user");
  return firstUser === -1 ? [] : recent.slice(firstUser).map(({ role, content }) => ({ role, content }));
}

/** Plain-language text for what went wrong. */
export function chatErrorMessage(err: unknown) {
  const { status, code } = (err ?? {}) as Partial<ApiError>;
  if (status === 429 || code === "RATE_LIMITED") return "You are sending messages very quickly. Please wait a minute and try again.";
  if (code === "AI_DISABLED" || status === 503) return "The assistant is switched off at the moment. Please call or message the clinic instead.";
  if (status === 422) return "That message could not be sent. Please make it shorter and try again.";
  return "The assistant is not available right now. Please try again, or contact the clinic.";
}
