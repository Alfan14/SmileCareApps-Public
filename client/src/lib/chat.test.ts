import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../types/api";
import { chatErrorMessage, historyFor, MAX_HISTORY } from "./chat";

const msg = (i: number): ChatMessage => ({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` });

describe("historyFor", () => {
  it("keeps at most the last 10 messages", () => {
    const all = Array.from({ length: 25 }, (_, i) => msg(i));
    expect(historyFor(all).length).toBeLessThanOrEqual(MAX_HISTORY);
  });

  it("starts with a user message and ends with the latest one", () => {
    const all = Array.from({ length: 13 }, (_, i) => msg(i)); // user, assistant, user, ... ends with user (index 12)
    const h = historyFor(all);
    expect(h[0]?.role).toBe("user");
    expect(h.at(-1)?.content).toBe("m12");
  });

  it("drops extra fields and handles an empty chat", () => {
    expect(historyFor([{ role: "user", content: "hi", id: "x" } as ChatMessage])).toEqual([{ role: "user", content: "hi" }]);
    expect(historyFor([])).toEqual([]);
  });
});

describe("chatErrorMessage", () => {
  it("explains rate limits, a switched-off assistant, bad input and everything else", () => {
    expect(chatErrorMessage({ status: 429 })).toMatch(/very quickly/);
    expect(chatErrorMessage({ code: "AI_DISABLED" })).toMatch(/switched off/);
    expect(chatErrorMessage({ status: 503 })).toMatch(/switched off/);
    expect(chatErrorMessage({ status: 422 })).toMatch(/shorter/);
    expect(chatErrorMessage(new Error("boom"))).toMatch(/not available/);
  });
});
