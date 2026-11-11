import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicLayout } from "../../layouts/PublicLayout";
import { ContactPage } from "./ContactPage";
import { DoctorPage } from "./DoctorPage";
import { FaqsPage } from "./FaqsPage";
import { HomePage } from "./HomePage";
import { TreatmentDetailPage } from "./TreatmentDetailPage";
import { TreatmentsPage } from "./TreatmentsPage";

const treatments = [
  { id: "t1", name: "Teeth Cleaning", slug: "teeth-cleaning", description: "Removes plaque and tartar.", durationMin: 45, priceMin: 150000, priceMax: 300000, bookingPrice: 150000, imageUrl: null, sortOrder: 1 },
  { id: "t2", name: "Root Canal Treatment", slug: "root-canal", description: "Saves damaged teeth.", durationMin: 90, priceMin: 600000, priceMax: 1200000, bookingPrice: 200000, imageUrl: null, sortOrder: 2 },
];
const faqs = [{ id: "f1", question: "How often should I visit?", answer: "Every six months.", category: "general", sortOrder: 1 }];
const reviews = [{ id: "r1", authorName: "Priya S.", rating: 5, comment: "Very gentle and kind.", createdAt: "2026-10-01T00:00:00.000Z" }];

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

function mockApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/me")) return jsonResponse({ error: "Please log in", code: "UNAUTHENTICATED" }, 401);
      if (url.endsWith("/treatments")) return jsonResponse(treatments);
      if (url.includes("/treatments/teeth-cleaning")) return jsonResponse(treatments[0]);
      if (url.includes("/treatments/")) return jsonResponse({ error: "Treatment not found", code: "NOT_FOUND" }, 404);
      if (url.includes("/faqs")) return jsonResponse(faqs);
      if (url.includes("/reviews")) return jsonResponse(reviews);
      return jsonResponse({ error: "unexpected" }, 500);
    }),
  );
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <PublicLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "treatments", element: <TreatmentsPage /> },
          { path: "treatments/:slug", element: <TreatmentDetailPage /> },
          { path: "doctor", element: <DoctorPage /> },
          { path: "faqs", element: <FaqsPage /> },
          { path: "contact", element: <ContactPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  mockApi();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("public pages render", () => {
  it("home shows hero, navigation and API data", async () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Healthy Smiles for a Brighter You");
    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
    expect((await screen.findAllByText("Teeth Cleaning")).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Very gentle and kind/)).toBeTruthy();
    expect(await screen.findByText("How often should I visit?")).toBeTruthy();
  });

  it("treatments page lists treatments with prices", async () => {
    renderAt("/treatments");
    expect(await screen.findByText("Root Canal Treatment")).toBeTruthy();
    expect(screen.getByText("₹1,500 – ₹3,000")).toBeTruthy();
    expect(screen.getByText("1 hr 30 min")).toBeTruthy();
  });

  it("treatment detail shows facts, and a friendly message for unknown slugs", async () => {
    renderAt("/treatments/teeth-cleaning");
    expect(await screen.findByRole("heading", { level: 1, name: "Teeth Cleaning" })).toBeTruthy();
    cleanup();
    renderAt("/treatments/unknown");
    expect(await screen.findByText("Treatment not found")).toBeTruthy();
  });

  it("doctor page shows the profile", async () => {
    renderAt("/doctor");
    expect(screen.getByRole("heading", { level: 1, name: "Dr. Aarav Mehta" })).toBeTruthy();
    expect(await screen.findByText(/Very gentle and kind/)).toBeTruthy();
  });

  it("faqs page filters by search text", async () => {
    renderAt("/faqs");
    expect(await screen.findByText("How often should I visit?")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search questions"), { target: { value: "zzz" } });
    expect(await screen.findByText("No matching questions")).toBeTruthy();
  });

  it("contact form validates before sending", async () => {
    renderAt("/contact");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("Please enter your name")).toBeTruthy();
    expect(screen.getByText("Please enter a valid email address")).toBeTruthy();
    expect(vi.mocked(fetch).mock.calls.some(([u]) => String(u).includes("/contact"))).toBe(false);
  });
});
