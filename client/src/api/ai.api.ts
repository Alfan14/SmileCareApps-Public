import { aiSettingsFrom, aiTestFrom, chatReplyFrom } from "../lib/normalizeAi";
import type { AiSettingsInput, ChatMessage } from "../types/api";
import { api } from "./client";

/** Public. The AI key stays on the server; the browser only sends the conversation. */
type AiChatRequest = {
  message: string;
  history: ChatMessage[];
};

/**
 * Converts frontend conversation history into the backend contract:
 * { message, history }
 *
 * Backend limits:
 * - Current message: 1200 characters
 * - Previous history: 6 messages maximum
 * - Each history message: 1000 characters
 * - Combined content: 5000 characters maximum
 */
function toAiChatRequest(messages: ChatMessage[]): AiChatRequest {
  const current = messages[messages.length - 1];

  if (!current || current.role !== "user") {
    throw new Error("The latest conversation message must be from the user.");
  }

  const message = current.content.trim();

  if (!message || message.length > 1200) {
    throw new Error("Message must contain 1–1200 characters.");
  }

  // Keep at most six previous messages.
  let history = messages
    .slice(0, -1)
    .slice(-6)
    .map(({ role, content }) => ({
      role,
      content: content.trim().slice(0, 1000),
    }))
    .filter((item) => item.content.length > 0);

  // A conversation should begin with a user message,
  // not an isolated assistant response.
  const firstUserIndex = history.findIndex(
    (item) => item.role === "user",
  );

  history =
    firstUserIndex === -1
      ? []
      : history.slice(firstUserIndex);

  // Enforce the backend's 5000-character combined limit.
  while (
    history.length > 0 &&
    message.length +
      history.reduce((total, item) => total + item.content.length, 0) >
      5000
  ) {
    history = history.slice(1);

    const nextUserIndex = history.findIndex(
      (item) => item.role === "user",
    );

    history =
      nextUserIndex === -1
        ? []
        : history.slice(nextUserIndex);
  }

  return {
    message,
    history,
  };
}

export const sendChat = (messages: ChatMessage[]) =>
  api<unknown>("/ai/chat", {
    method: "POST",
    body: JSON.stringify(toAiChatRequest(messages)),
  }).then(chatReplyFrom);
  
// Owner only.
// Owner only.
export const getAiSettings = () =>
  api<unknown>("/owner/ai/settings").then(aiSettingsFrom);

export const saveAiSettings = (input: AiSettingsInput) =>
  api<unknown>("/owner/ai/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });export const testAiConnection = () => api<unknown>("/owner/ai/settings/test", { method: "POST" }).then(aiTestFrom);

