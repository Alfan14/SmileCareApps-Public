import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicLayout } from "../../layouts/PublicLayout";
import { GuestRoute } from "../../routes/GuestRoute";
import { ProtectedRoute } from "../../routes/ProtectedRoute";
import { RoleRoute } from "../../routes/RoleRoute";
import { jsonResponse, mockFetch, renderRoutes } from "../../../tests/helpers";
import type { User } from "../../types/api";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

const patient: User = { id: "p1", name: "Priya Sharma", email: "priya@example.com", phone: null, role: "PATIENT" };
const guest = () => jsonResponse({ error: "Please log in", code: "UNAUTHENTICATED" }, 401);

const routes = [
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <p>Home stub</p> },
      {
        element: <GuestRoute />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [{ element: <RoleRoute role="PATIENT" />, children: [{ path: "patient", element: <p>Patient area</p> }] }],
      },
    ],
  },
];

function typeInto(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function bodyOf(fn: ReturnType<typeof mockFetch>, path: string) {
  const call = fn.mock.calls.find(([url]) => String(url).includes(path));
  return JSON.parse(String(call?.[1]?.body ?? "{}"));
}

window.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("login page", () => {
  it("shows validation errors and sends nothing", async () => {
    const fetchMock = mockFetch({ "GET /auth/me": guest });
    renderRoutes(routes, "/login");
    fireEvent.click(await screen.findByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Please enter a valid email address")).toBeTruthy();
    expect(screen.getByText("Please enter your password")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("logs in and lands on the patient dashboard", async () => {
    const fetchMock = mockFetch({
      "GET /auth/me": guest,
      "POST /auth/login": () => jsonResponse({ user: patient }),
    });
    renderRoutes(routes, "/login");
    await screen.findByLabelText("Email");
    typeInto("Email", "priya@example.com");
    typeInto("Password", "Secret123");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Patient area")).toBeTruthy();
    expect(bodyOf(fetchMock, "/auth/login")).toEqual({ email: "priya@example.com", password: "Secret123" });
  });

  it("shows the server message for wrong credentials", async () => {
    mockFetch({
      "GET /auth/me": guest,
      "POST /auth/login": () => jsonResponse({ error: "Incorrect email or password", code: "INVALID_CREDENTIALS" }, 401),
    });
    renderRoutes(routes, "/login");
    await screen.findByLabelText("Email");
    typeInto("Email", "priya@example.com");
    typeInto("Password", "WrongPass1");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Incorrect email or password")).toBeTruthy();
  });

  it("fills the form from a demo account", async () => {
    mockFetch({ "GET /auth/me": guest });
    renderRoutes(routes, "/login");
    fireEvent.click(await screen.findByRole("button", { name: "Patient demo" }));
    await waitFor(() => expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("patient@smilecare.test"));
  });
});

describe("register page", () => {
  async function fillValid() {
    await screen.findByLabelText("Full name *");
    typeInto("Full name *", "Priya Sharma");
    typeInto("Email *", "priya@example.com");
    typeInto("Password *", "Secret123");
    typeInto("Repeat password *", "Secret123");
  }

  it("checks that the passwords match", async () => {
    mockFetch({ "GET /auth/me": guest });
    renderRoutes(routes, "/register");
    await fillValid();
    typeInto("Repeat password *", "Different1");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Passwords do not match")).toBeTruthy();
  });

  it("creates the account without sending confirmPassword", async () => {
    const fetchMock = mockFetch({
      "GET /auth/me": guest,
      "POST /auth/register": () => jsonResponse({ user: patient }, 201),
    });
    renderRoutes(routes, "/register");
    await fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Patient area")).toBeTruthy();
    expect(bodyOf(fetchMock, "/auth/register")).toEqual({ name: "Priya Sharma", email: "priya@example.com", password: "Secret123" });
  });

  it("shows an existing email on the email field", async () => {
    mockFetch({
      "GET /auth/me": guest,
      "POST /auth/register": () => jsonResponse({ error: "An account with this email already exists", code: "EMAIL_TAKEN" }, 409),
    });
    renderRoutes(routes, "/register");
    await fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("An account with this email already exists")).toBeTruthy();
  });
});

describe("navbar", () => {
  it("shows Log in to guests", async () => {
    mockFetch({ "GET /auth/me": guest });
    renderRoutes(routes, "/");
    expect(await screen.findByRole("link", { name: "Log in" })).toBeTruthy();
  });

  it("shows Dashboard and Log out to a patient, and logging out returns to guest", async () => {
    const fetchMock = mockFetch({
      "GET /auth/me": () => jsonResponse({ user: patient }),
      "POST /auth/logout": () => jsonResponse(null, 204),
    });
    renderRoutes(routes, "/");
    expect(await screen.findByRole("link", { name: "Dashboard" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByRole("link", { name: "Log in" })).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).includes("/auth/logout") && init?.method === "POST")).toBe(true);
  });
});
