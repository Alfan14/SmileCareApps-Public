import { cleanup, screen } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, mockFetch, renderRoutes } from "../../tests/helpers";
import type { User } from "../types/api";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";

const patient: User = { id: "p1", name: "Priya Sharma", email: "priya@example.com", phone: null, role: "PATIENT" };
const owner: User = { id: "o1", name: "Dr. Aarav Mehta", email: "owner@smilecare.test", phone: null, role: "OWNER" };

function LoginStub() {
  const location = useLocation();
  return <p>Login page {JSON.stringify(location.state)}</p>;
}

const routes = [
  { element: <GuestRoute />, children: [{ path: "/login", element: <LoginStub /> }] },
  {
    element: <ProtectedRoute />,
    children: [
      { element: <RoleRoute role="PATIENT" />, children: [{ path: "/patient", element: <p>Patient area</p> }] },
      { element: <RoleRoute role="OWNER" />, children: [{ path: "/owner", element: <p>Owner area</p> }] },
    ],
  },
];

function loggedInAs(user: User | null) {
  mockFetch({
    "GET /auth/me": () => (user ? jsonResponse({ user }) : jsonResponse({ error: "Please log in", code: "UNAUTHENTICATED" }, 401)),
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("route guards", () => {
  it("sends guests to /login and remembers where they were going", async () => {
    loggedInAs(null);
    renderRoutes(routes, "/patient?tab=invoices");
    const text = (await screen.findByText(/Login page/)).textContent ?? "";
    expect(text).toContain("/patient?tab=invoices");
  });

  it("lets a patient into the patient area", async () => {
    loggedInAs(patient);
    renderRoutes(routes, "/patient");
    expect(await screen.findByText("Patient area")).toBeTruthy();
  });

  it("shows a no-access page when a patient opens the owner area", async () => {
    loggedInAs(patient);
    renderRoutes(routes, "/owner");
    expect(await screen.findByRole("heading", { name: "You do not have access to this page" })).toBeTruthy();
    expect(screen.queryByText("Owner area")).toBeNull();
  });

  it("lets the owner into the owner area", async () => {
    loggedInAs(owner);
    renderRoutes(routes, "/owner");
    expect(await screen.findByText("Owner area")).toBeTruthy();
  });

  it("sends logged-in users away from /login to their own dashboard", async () => {
    loggedInAs(owner);
    renderRoutes(routes, "/login");
    expect(await screen.findByText("Owner area")).toBeTruthy();
  });
});
