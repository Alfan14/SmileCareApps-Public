import { describe, expect, it } from "vitest";
import { aiSettingsFrom, aiTestFrom, chatReplyFrom } from "./normalizeAi";

describe("chatReplyFrom", () => {
  it("finds the answer in the usual places", () => {
    expect(
      chatReplyFrom({ reply: "Brush twice a day.", provider: "mock" }),
    ).toEqual({ reply: "Brush twice a day.", provider: "mock" });
    expect(chatReplyFrom({ message: "Hello" }).reply).toBe("Hello");
    expect(chatReplyFrom({ answer: "A" }).reply).toBe("A");
    expect(chatReplyFrom({ message: { content: "Nested" } }).reply).toBe(
      "Nested",
    );
    expect(chatReplyFrom({ data: { reply: "Deep" } }).reply).toBe("Deep");
  });

  it("ignores an unknown provider and fails clearly on an empty answer", () => {
    expect(
      chatReplyFrom({ reply: "Hi", provider: "something" }).provider,
    ).toBeNull();
    expect(() => chatReplyFrom({ reply: "  " })).toThrow(/empty answer/);
    expect(() => chatReplyFrom(null)).toThrow();
  });
});

describe("aiSettingsFrom", () => {
  it("reads wrapped settings with the last 4 characters of the key", () => {
    expect(
      aiSettingsFrom({
        settings: {
          provider: "gemini",
          model: "m-1",
          enabled: true,
          keyLast4: "abcd",
        },
      }),
    ).toEqual({
      provider: "gemini",
      model: "m-1",
      enabled: true,
      hasKey: true,
      keyLast4: "abcd",
    });
  });

  it("derives the last 4 characters from a masked key and defaults safely", () => {
    expect(
      aiSettingsFrom({ provider: "OPENAI", maskedKey: "••••wxyz" }),
    ).toMatchObject({ provider: "openai", hasKey: true, keyLast4: "wxyz" });
    expect(aiSettingsFrom({})).toEqual({
      provider: "mock",
      model: "",
      enabled: true,
      hasKey: false,
      keyLast4: null,
    });
    expect(aiSettingsFrom({ provider: "nope", enabled: false }).provider).toBe(
      "mock",
    );
    expect(aiSettingsFrom({ enabled: false }).enabled).toBe(false);
  });

  it("never exposes a raw key even if the server sent one by mistake", () => {
    const s = aiSettingsFrom({
      provider: "gemini",
      apiKey: "SECRET-KEY-123456",
    });
    expect(JSON.stringify(s)).not.toContain("SECRET");
  });
});

describe("aiTestFrom", () => {
  it("reads success and failure", () => {
    expect(aiTestFrom({ ok: true })).toEqual({
      ok: true,
      message: "The connection works.",
    });
    expect(aiTestFrom({ ok: false, message: "Invalid key" })).toEqual({
      ok: false,
      message: "Invalid key",
    });
    expect(aiTestFrom(undefined).ok).toBe(false);
  });
});
