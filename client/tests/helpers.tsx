import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { vi } from "vitest";

export function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
}

export type Handler = (init?: RequestInit) => Promise<Response>;

/** Replaces fetch. Keys look like "POST /auth/login"; the first matching handler answers. */
export function mockFetch(routes: Record<string, Handler>) {
  const fn = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const url = String(input);
    for (const [key, handler] of Object.entries(routes)) {
      const [m, path] = key.split(" ");
      if (m === method && path && url.includes(path)) return handler(init);
    }
    return jsonResponse({ error: `unexpected request ${method} ${url}` }, 500);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

export function renderRoutes(routes: RouteObject[], path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
