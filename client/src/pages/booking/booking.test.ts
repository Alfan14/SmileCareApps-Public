import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../../routes/ProtectedRoute";
import { RoleRoute } from "../../routes/RoleRoute";
import { addDays, weekdayOf } from "../../lib/dates";
import { TODAY } from "../../lib/booking";
import { jsonResponse, mockFetch, renderRoutes } from "../../../tests/helpers";
import type { Handler } from "../../../tests/helpers";
import type { User } from "../../types/api";
import { BookingPage } from "./BookingPage";

const patient: User = { id: "p1", name: "Priya Sharma", email: "priya@example.com", phone: "+911234567890", role: "PATIENT" };
const treatments = [
  { id: "t1", name: "Teeth Cleaning", slug: "teeth-cleaning", description: "Removes plaque.", durationMin: 45, priceMin: 150000, priceMax: 300000, bookingPrice: 150000, imageUrl: null, sortOrder: 1 },
  { id: "t2", name: "Root Canal Treatment", slug: "root-canal", description: "Saves teeth.", durationMin: 90, priceMin: 600000, priceMax: 1200000, bookingPrice: 200000, imageUrl: null, sortOrder: 2 },
];

// A day with open slots: two days ahead, skipping Sunday (the clinic is closed on Sundays).
function openDate() {
  let d = addDays(TODAY, 2);
  while (weekdayOf(d) === 0) d = addDays(d, 1);
  return d;
}
const DATE = openDate();
const SLOT_A = `${DATE}T04:30:00.000Z`; // 10:00 am India time
const SLOT_B = `${DATE}T05:00:00.000Z`; // 10:30 am


const routes = [
  { path: "/login", element: createElement("p", null, "Login page") },
  {
    element: createElement(ProtectedRoute),
    children: [{ element: createElement(RoleRoute, { role: "PATIENT" }), children: [{ path: "/book", element: createElement(BookingPage) }] }],
  },
];

function api(overrides: Record<string, Handler> = {}) {
  return mockFetch({
    "GET /auth/me": () => jsonResponse({ user: patient }),
    "GET /treatments": () => jsonResponse(treatments),
    "GET /slots": () => jsonResponse({ slots: [{ start: SLOT_A }, { start: SLOT_B }] }),
    "POST /appointments": () =>
      jsonResponse({ appointment: { id: "apt_0123456789", status: "PENDING", holdExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString() } }, 201),
    ...overrides,
  });
}

const postedBody = (fn: ReturnType<typeof mockFetch>) => {
  const call = fn.mock.calls.find(([url, init]) => String(url).includes("/appointments") && init?.method === "POST");
  return call ? JSON.parse(String(call[1]?.body)) : null;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("booking wizard", () => {
  it("reserves a slot using the treatment and date from the URL", async () => {
    const fetchMock = api();
    renderRoutes(routes, `/book?treatment=teeth-cleaning&date=${DATE}`);

    fireEvent.click(await screen.findByRole("button", { name: /10:00/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reserve my slot" }));

    expect(await screen.findByRole("heading", { name: "Your slot is held" })).toBeTruthy();
    expect(await screen.findByRole("timer")).toBeTruthy();
    expect(postedBody(fetchMock)).toEqual({ treatmentId: "t1", startTime: SLOT_A, consultationType: "IN_CLINIC", isNewPatient: false });
  });

  it("sends the chosen consultation type and new-patient flag", async () => {
    const fetchMock = api();
    renderRoutes(routes, `/book?treatment=root-canal&date=${DATE}`);

    fireEvent.click(await screen.findByRole("button", { name: /10:30/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Video consultation/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /new patient/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reserve my slot" }));

    await screen.findByRole("heading", { name: "Your slot is held" });
    expect(postedBody(fetchMock)).toEqual({ treatmentId: "t2", startTime: SLOT_B, consultationType: "VIDEO", isNewPatient: true });
  });

  it("cannot reserve until treatment, date and time are chosen", async () => {
    api();
    renderRoutes(routes, "/book");
    const button = (await screen.findByRole("button", { name: "Reserve my slot" })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText("a treatment, a date, a time")).toBeTruthy();
  });

  it("ignores past, invalid and Sunday dates in the URL", async () => {
    api();
    const sunday = (() => {
      let d = addDays(TODAY, 1);
      while (weekdayOf(d) !== 0) d = addDays(d, 1);
      return d;
    })();
    for (const bad of ["2020-01-01", "2026-02-31", sunday]) {
      const view = renderRoutes(routes, `/book?treatment=teeth-cleaning&date=${bad}`);
      expect(await screen.findByText("a date, a time")).toBeTruthy();
      view.unmount();
    }
  });

  it("shows the server message and clears the choice when the slot was just taken", async () => {
    api({ "POST /appointments": () => jsonResponse({ error: "That slot was just taken", code: "SLOT_TAKEN" }, 409) });
    renderRoutes(routes, `/book?treatment=teeth-cleaning&date=${DATE}`);

    fireEvent.click(await screen.findByRole("button", { name: /10:00/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reserve my slot" }));

    expect(await screen.findByText("That slot was just taken")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("a time")).toBeTruthy()); // selection cleared, so a new time is needed
  });

  it("sends the visitor to log in when the session has expired", async () => {
    api({ "POST /appointments": () => jsonResponse({ error: "Your session has expired. Please log in again", code: "UNAUTHENTICATED" }, 401) });
    renderRoutes(routes, `/book?treatment=teeth-cleaning&date=${DATE}`);

    fireEvent.click(await screen.findByRole("button", { name: /10:00/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reserve my slot" }));

    expect(await screen.findByText("Login page")).toBeTruthy();
  });

  it("tells the visitor when a day has no times", async () => {
    api({ "GET /slots": () => jsonResponse({ slots: [] }) });
    renderRoutes(routes, `/book?treatment=teeth-cleaning&date=${DATE}`);
    expect(await screen.findByText(/No times are available on this day/)).toBeTruthy();
  });
});
