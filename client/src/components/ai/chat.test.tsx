import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, mockFetch, renderRoutes } from "../../../tests/helpers";
import type { Handler } from "../../../tests/helpers";
import { ChatPanel } from "./ChatPanel";

const routes = [{ path: "/", element: <ChatPanel /> }];

function api(chat: Handler) {
  return mockFetch({ "POST /ai/chat": chat });
}

type ChatRequestBody = {
  message: string;
  history: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

const chatBodies = (fn: ReturnType<typeof mockFetch>) =>
  fn.mock.calls
    .filter(([u, init]) => String(u).includes("/ai/chat") && init?.method === "POST")
    .map(([, init]) => JSON.parse(String(init?.body)) as ChatRequestBody);
const log = () => screen.getByRole("log", { name: "Conversation" });
const input = () =>
  screen.getByLabelText("Your question") as HTMLTextAreaElement;



beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("chat panel", () => {
  it("greets the visitor and always shows the disclaimer", () => {
    api(() => jsonResponse({ reply: "x" }));
    renderRoutes(routes, "/");
    expect(within(log()).getByText(/AI dental assistant/)).toBeTruthy();
    expect(screen.getByText("General information only.")).toBeTruthy();
    expect(
      screen.getByText(/does not replace advice from your dentist/),
    ).toBeTruthy();
  });

  it("answers a suggested question", async () => {
    const fetchMock = api(() =>
      jsonResponse({
        reply: "Sensitivity often comes from worn enamel or gum recession.",
      }),
    );
    renderRoutes(routes, "/");
    fireEvent.click(
      screen.getByRole("button", { name: "What causes tooth sensitivity?" }),
    );

    expect(await within(log()).findByText(/worn enamel/)).toBeTruthy();
    expect(chatBodies(fetchMock)).toEqual([
      { message: "What causes tooth sensitivity?", history: [] },
    ]);
    expect(screen.queryByText("Try asking")).toBeNull(); // suggestions disappear once the chat starts
  });

  it("sends on Enter but not on Shift+Enter", async () => {
    const fetchMock = api(() => jsonResponse({ reply: "Brush twice a day." }));
    renderRoutes(routes, "/");

    fireEvent.change(input(), {
      target: { value: "How often should I brush?" },
    });
    fireEvent.keyDown(input(), { key: "Enter", shiftKey: true });
    expect(chatBodies(fetchMock)).toHaveLength(0);

    fireEvent.keyDown(input(), { key: "Enter" });
    expect(await within(log()).findByText("Brush twice a day.")).toBeTruthy();
    expect(chatBodies(fetchMock)).toHaveLength(1);
    expect(input().value).toBe(""); // the box is cleared after sending
  });

  it("blocks messages over 500 characters", () => {
    const fetchMock = api(() => jsonResponse({ reply: "x" }));
    renderRoutes(routes, "/");
    fireEvent.change(input(), { target: { value: "a".repeat(501) } });

    expect(screen.getByText("501/500")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Send message",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(chatBodies(fetchMock)).toHaveLength(0);
  });

  it("sends the latest question separately and keeps at most six prior messages", async () => {
    const fetchMock = api(() => jsonResponse({ reply: "ok" }));
    renderRoutes(routes, "/");

    for (let i = 1; i <= 7; i++) {
      fireEvent.change(input(), { target: { value: `question ${i}` } });
      fireEvent.keyDown(input(), { key: "Enter" });

      await waitFor(() =>
        expect(within(log()).getAllByText("ok")).toHaveLength(i),
      );
    }

    const last = chatBodies(fetchMock).at(-1)!;

    expect(last.message).toBe("question 7");
    expect(last.history.length).toBeLessThanOrEqual(6);
    expect(last.history[0]?.role).toBe("user");
    expect(last.history.at(-1)?.role).toBe("assistant");
  });

  it("shows a friendly message for rate limits and lets the visitor retry", async () => {
    let calls = 0;
    const fetchMock = api(() =>
      ++calls === 1
        ? jsonResponse(
            { error: "Too many requests", code: "RATE_LIMITED" },
            429,
          )
        : jsonResponse({ reply: "Here you go." }),
    );
    renderRoutes(routes, "/");
    fireEvent.change(input(), { target: { value: "Hello" } });
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(await screen.findByText(/very quickly/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await within(log()).findByText("Here you go.")).toBeTruthy();

    const bodies = chatBodies(fetchMock);
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual(bodies[0]); // the retry resends the same conversation, without duplicating the question
    expect(within(log()).getAllByText("Hello")).toHaveLength(1);
  });

  it("explains when the owner has switched the assistant off", async () => {
    api(() =>
      jsonResponse(
        { error: "The assistant is switched off", code: "AI_DISABLED" },
        503,
      ),
    );
    renderRoutes(routes, "/");
    fireEvent.change(input(), { target: { value: "Hello" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(await screen.findByText(/switched off at the moment/)).toBeTruthy();
  });

  it("starts fresh on New chat and ignores an answer that arrives late", async () => {
    let release: (r: Response) => void = () => {};
    api(() => new Promise<Response>((resolve) => (release = resolve)));
    renderRoutes(routes, "/");

    fireEvent.change(input(), { target: { value: "First question" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(await screen.findByText("The assistant is typing…")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /New chat/ }));
    release(
      new Response(JSON.stringify({ reply: "Too late" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await waitFor(() =>
      expect(screen.queryByText("The assistant is typing…")).toBeNull(),
    );
    expect(within(log()).queryByText("Too late")).toBeNull();
    expect(within(log()).queryByText("First question")).toBeNull();
  });

  it("shows the answer as plain text and never as HTML", async () => {
    api(() =>
      jsonResponse({ reply: '<img src=x onerror="alert(1)"> **bold**' }),
    );
    const { container } = renderRoutes(routes, "/");
    fireEvent.change(input(), { target: { value: "Hi" } });
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(await within(log()).findByText(/<img src=x/)).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });

  it("tells the visitor when the answers are pre-written demo answers", async () => {
    api(() => jsonResponse({ reply: "Canned answer.", provider: "mock" }));
    renderRoutes(routes, "/");
    fireEvent.change(input(), { target: { value: "Hi" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(
      await screen.findByText(/Demo mode: these answers are pre-written/),
    ).toBeTruthy();
  });
});
