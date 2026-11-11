import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OwnerLayout } from "../../layouts/OwnerLayout";
import { ProtectedRoute } from "../../routes/ProtectedRoute";
import { RoleRoute } from "../../routes/RoleRoute";
import { jsonResponse, mockFetch, renderRoutes } from "../../../tests/helpers";
import type { Handler } from "../../../tests/helpers";
import type { User } from "../../types/api";
import { OwnerAiSettingsPage } from "./OwnerAiSettingsPage";

const owner: User = {
  id: "o1",
  name: "Dr. Aarav Mehta",
  email: "owner@smilecare.test",
  phone: null,
  role: "OWNER",
};

const routes = [
  { path: "/login", element: <p>Login page</p> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleRoute role="OWNER" />,
        children: [
          {
            path: "/owner",
            element: <OwnerLayout />,
            children: [
              {
                path: "ai-settings",
                element: <OwnerAiSettingsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
];

const saved = {
  settings: {
    provider: "openai",
    model: "gpt-6-luna",
    enabled: true,
    keyConfigured: true,
    keyLast4: "abcd",
    promptVersion: "v1",
    budgetUsd: 5,
  },
};

function api(overrides: Record<string, Handler> = {}) {
  return mockFetch({
    "GET /auth/me": () => jsonResponse({ user: owner }),

    // These are API paths, not frontend page routes.
    "GET /owner/ai/settings": () => jsonResponse(saved),
    "PUT /owner/ai/settings": () =>
      jsonResponse({ settings: saved.settings }),

    // Mock for the frontend's current test-connection request.
    "POST /owner/ai/settings/test": () =>
      jsonResponse({
        ok: true,
        message: "Connected to OpenAI.",
      }),

    ...overrides,
  });
}

const sent = (
  fn: ReturnType<typeof mockFetch>,
  method: string,
  path: string,
) => {
  const call = fn.mock.calls.find(
    ([url, init]) =>
      String(url).includes(path) && init?.method === method,
  );

  return call
    ? JSON.parse(String(call[1]?.body ?? "null"))
    : null;
};

const key = () => screen.getByLabelText("API key") as HTMLInputElement;

const provider = () =>
  screen.getByLabelText("Provider") as HTMLSelectElement;

const model = () =>
  screen.getByLabelText(/Model/) as HTMLInputElement;

const saveButton = () =>
  screen.getByRole("button", { name: "Save settings" });

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AI settings (owner)", () => {
  it("shows the saved settings and only the last 4 characters of the key", async () => {
    api();

    renderRoutes(routes, "/owner/ai-settings");

    expect(await screen.findByText(/A key is saved/i)).toBeTruthy();
    expect(screen.getByText(/ends in abcd/i)).toBeTruthy();

    expect(provider().value).toBe("openai");
    expect(model().value).toBe("gpt-6-luna");
    expect(key().value).toBe("");

    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("sends a new API key once, then clears the field and never displays it", async () => {
    const fetchMock = api();

    renderRoutes(routes, "/owner/ai-settings");

    await screen.findByText(/A key is saved/i);

    const newApiKey = "sk-12345678901234567890";

    fireEvent.change(key(), {
      target: { value: newApiKey },
    });

    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(sent(fetchMock, "PUT", "/owner/ai/settings")).toEqual({
        provider: "openai",
        model: "gpt-6-luna",
        enabled: true,
        apiKey: newApiKey,
      });
    });

    expect(await screen.findByText("Saved.")).toBeTruthy();
    expect(key().value).toBe("");
    expect(document.body.textContent).not.toContain(newApiKey);
  });

  it("does not send an API key when the field is left empty", async () => {
    const fetchMock = api();

    renderRoutes(routes, "/owner/ai-settings");

    fireEvent.click(await screen.findByLabelText(/switched on for visitors/i));
    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(sent(fetchMock, "PUT", "/owner/ai/settings")).toEqual({
        provider: "openai",
        model: "gpt-6-luna",
        enabled: false,
      });
    });
  });

  it("rejects a value that does not look like an API key", async () => {
    const fetchMock = api();

    renderRoutes(routes, "/owner/ai-settings");

    await screen.findByText(/A key is saved/i);

    fireEvent.change(key(), {
      target: { value: "has spaces in it" },
    });

    fireEvent.click(saveButton());

    expect(
      await screen.findByText(/does not look like an API key/i),
    ).toBeTruthy();

    expect(sent(fetchMock, "PUT", "/owner/ai/settings")).toBeNull();
  });

  it("can switch the assistant off", async () => {
    const fetchMock = api();

    renderRoutes(routes, "/owner/ai-settings");

    fireEvent.click(
      await screen.findByLabelText(/switched on for visitors/i),
    );

    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(
        sent(fetchMock, "PUT", "/owner/ai/settings"),
      ).toMatchObject({
        provider: "openai",
        enabled: false,
      });
    });
  });

  it("tests the saved connection and shows the result", async () => {
    api();

    renderRoutes(routes, "/owner/ai-settings");

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Test connection",
      }),
    );

    expect(
      await screen.findByText("Connected to OpenAI."),
    ).toBeTruthy();
  });

  it("shows a failed connection test and prevents testing unsaved changes", async () => {
    api({
      "POST /owner/ai/settings/test": () =>
        jsonResponse({
          ok: false,
          message: "The provider rejected the key.",
        }),
    });

    renderRoutes(routes, "/owner/ai-settings");

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Test connection",
      }),
    );

    expect(
      await screen.findByText("The provider rejected the key."),
    ).toBeTruthy();

    fireEvent.change(key(), {
      target: { value: "sk-12345678901234567890" },
    });

    expect(
      (screen.getByRole("button", {
        name: "Test connection",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);

    expect(screen.getByText(/Save your changes first/i)).toBeTruthy();
  });

  it("shows the server's message when saving fails", async () => {
    api({
      "PUT /owner/ai/settings": () =>
        jsonResponse(
          {
            error: "Could not save the settings",
            code: "INTERNAL",
          },
          500,
        ),
    });

    renderRoutes(routes, "/owner/ai-settings");

    fireEvent.click(
      await screen.findByLabelText(/switched on for visitors/i),
    );

    fireEvent.click(saveButton());

    expect(
      await screen.findByText("Could not save the settings"),
    ).toBeTruthy();
  });

  it("sends the owner to login when the session has expired", async () => {
    api({
      "GET /owner/ai/settings": () =>
        jsonResponse(
          {
            error: "Please log in",
            code: "UNAUTHENTICATED",
          },
          401,
        ),
    });

    renderRoutes(routes, "/owner/ai-settings");

    expect(await screen.findByText("Login page")).toBeTruthy();
  });
});