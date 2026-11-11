import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { cloneElement } from "react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OwnerLayout } from "../../layouts/OwnerLayout";
import { ProtectedRoute } from "../../routes/ProtectedRoute";
import { RoleRoute } from "../../routes/RoleRoute";
import { addDays, todayInClinic } from "../../lib/dates";
import { jsonResponse, mockFetch, renderRoutes } from "../../../tests/helpers";
import type { Handler } from "../../../tests/helpers";
import type { User } from "../../types/api";
import { OwnerAppointmentsPage } from "./OwnerAppointmentsPage";
import { OwnerDashboardPage } from "./OwnerDashboardPage";
import { OwnerPatientsPage } from "./OwnerPatientsPage";
import { OwnerRecordsPage } from "./OwnerRecordsPage";
import { OwnerSettingsPage } from "./OwnerSettingsPage";

// Charts need a measured parent, which jsdom does not have. Give them a fixed size.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 600, height: 240 } as never),
  };
});

const owner: User = {
  id: "o1",
  name: "Dr. Aarav Mehta",
  email: "owner@smilecare.test",
  phone: null,
  role: "OWNER",
};
const patient: User = {
  id: "p1",
  name: "Priya Sharma",
  email: "priya@example.com",
  phone: null,
  role: "PATIENT",
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
              { index: true, element: <OwnerDashboardPage /> },
              { path: "appointments", element: <OwnerAppointmentsPage /> },
              { path: "patients", element: <OwnerPatientsPage /> },
              { path: "records", element: <OwnerRecordsPage /> },
              { path: "settings", element: <OwnerSettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
];

const stats = {
  timezone: "Asia/Kolkata",
  range: "7d",
  summary: {
    totalPatients: 4,
    appointmentsToday: 0,
    pendingAppointments: 0,
    completedThisMonth: 0,
    revenuePaiseThisMonth: 0,
    paidTransactionsThisMonth: 0,
    currency: "inr",
  },
  charts: {
    bookingsByDay: [
      { date: "2026-10-29", count: 1 },
      { date: "2026-10-30", count: 0 },
      { date: "2026-10-31", count: 2 },
      { date: "2026-11-01", count: 0 },
      { date: "2026-11-02", count: 0 },
      { date: "2026-11-03", count: 0 },
      { date: "2026-11-04", count: 0 },
    ],
    revenueByDay: [
      { date: "2026-10-29", revenuePaise: 0, currency: "inr" },
      { date: "2026-10-30", revenuePaise: 0, currency: "inr" },
      { date: "2026-10-31", revenuePaise: 0, currency: "inr" },
      { date: "2026-11-01", revenuePaise: 0, currency: "inr" },
      { date: "2026-11-02", revenuePaise: 0, currency: "inr" },
      { date: "2026-11-03", revenuePaise: 0, currency: "inr" },
      { date: "2026-11-04", revenuePaise: 0, currency: "inr" },
    ],
    appointmentsByStatus: [{ status: "PENDING", count: 3 }],
  },
  upcomingSchedule: [],
};

const HOUR = 3_600_000;
const at = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();
const appointments = [
  {
    id: "a_done",
    startTime: at(-3),
    status: "COMPLETED",
    consultationType: "IN_CLINIC",
    treatment: { name: "Teeth Cleaning" },
    patient: { id: "p1", name: "Priya Sharma", phone: "+91 98765 00001" },
  },
  {
    id: "a_now",
    startTime: at(-0.1),
    status: "CONFIRMED",
    consultationType: "IN_CLINIC",
    isNewPatient: true,
    treatment: { name: "Root Canal Treatment" },
    patient: { id: "p2", name: "Rahul Verma", phone: "+91 98765 00002" },
  },
  {
    id: "a_later",
    startTime: at(5),
    status: "CONFIRMED",
    consultationType: "VIDEO",
    treatment: { name: "General Consultation" },
    patient: { id: "p3", name: "Neha Patel" },
  },
];
const patients = [
  {
    id: "p1",
    name: "Priya Sharma",
    email: "priya@example.com",
    phone: "+91 98765 00001",
    appointmentCount: 3,
    lastVisit: at(-72),
  },
  {
    id: "p2",
    name: "Rahul Verma",
    email: "rahul@example.com",
    appointmentCount: 1,
  },
];
const availability = {
  workingHours: [
    {
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "19:00",
      breakStart: "13:00",
      breakEnd: "14:00",
      slotMinutes: 30,
      isOff: false,
    },
    {
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "19:00",
      breakStart: null,
      breakEnd: null,
      slotMinutes: 30,
      isOff: true,
    },
  ],
  blockedDates: [{ date: "2026-12-25", reason: "Holiday" }],
};
function api(overrides: Record<string, Handler> = {}) {
  return mockFetch({
    "GET /auth/me": () => jsonResponse({ user: owner }),
    "GET /owner/dashboard": () => jsonResponse(stats),
    "GET /owner/schedule": () => jsonResponse({ appointments }),
    "GET /owner/patients": () => jsonResponse({ patients }),
    "PATCH /owner/appointments/": () =>
      jsonResponse({ appointment: { id: "a_now", status: "COMPLETED" } }),
    "POST /owner/appointments/": () =>
      jsonResponse({ appointment: { id: "a_later", status: "CANCELLED" } }),
    "POST /owner/records": () => jsonResponse({ record: { id: "rec_1" } }, 201),
    "POST /owner/prescriptions": () =>
      jsonResponse({ prescription: { id: "rx_1" } }, 201),
    "GET /owner/working-hours": () =>
      jsonResponse({
        data: availability.workingHours,
      }),
    "GET /owner/blocked-dates": () =>
      jsonResponse({
        range: {
          from: todayInClinic(),
          to: addDays(todayInClinic(), 365),
        },
        data: availability.blockedDates,
      }),
    "PUT /owner/working-hours/": () =>
      jsonResponse({ ok: true }),
    "POST /owner/blocked-dates": () =>
      jsonResponse(
        { blockedDate: { id: "blocked_2" } },
        201,
      ),

    "DELETE /owner/blocked-dates/": () =>
      jsonResponse({ ok: true }),
    ...overrides,
  });
}

const rowFor = async (name: string) =>
  (await screen.findByText(name)).closest("li") as HTMLElement;

const body = (
  fn: ReturnType<typeof mockFetch>,
  method: string,
  path: string,
) => {
  const call = fn.mock.calls.find(
    ([u, init]) => String(u).includes(path) && init?.method === method,
  );
  return call ? JSON.parse(String(call[1]?.body)) : null;
};

beforeEach(() => {
  window.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("access", () => {
  it("shows a patient the no-access page instead of the clinic dashboard", async () => {
    mockFetch({ "GET /auth/me": () => jsonResponse({ user: patient }) });
    renderRoutes(routes, "/owner");
    expect(
      await screen.findByRole("heading", {
        name: "You do not have access to this page",
      }),
    ).toBeTruthy();
  });

  it("sends the owner to log in when the session has expired", async () => {
    api({
      "GET /owner/dashboard": () =>
        jsonResponse(
          { error: "Please log in", code: "UNAUTHENTICATED" },
          401
        ),
    });

    renderRoutes(routes, "/owner");

    expect(await screen.findByText("Login page")).toBeTruthy();
  });
});

describe("overview", () => {
  it("shows the key numbers, charts with text summaries, and today's schedule", async () => {
    api();
    renderRoutes(routes, "/owner");

    expect(
      await screen.findByRole("heading", {
        name: /Welcome back, Dr\. Aarav Mehta/,
      })
    ).toBeTruthy();

    const kpis = within(
      await screen.findByRole("region", { name: "Key numbers" })
    );

    // Dashboard summary fields
    expect(kpis.getByText("Appointments today")).toBeTruthy();
    expect(kpis.getByText("Total patients")).toBeTruthy();
    expect(kpis.getByText("Revenue this month")).toBeTruthy();
    expect(kpis.getByText("Pending appointments")).toBeTruthy();
    expect(kpis.getByText("Completed this month")).toBeTruthy();
    expect(kpis.getByText("Paid transactions")).toBeTruthy();

    expect(kpis.getByText("4")).toBeTruthy();
    expect(kpis.getByText("₹0")).toBeTruthy();

    // Dashboard charts
    expect(
      await screen.findByRole("img", {
        name: /Bookings.*3 in total/i,
      })
    ).toBeTruthy();

    expect(
      screen.getByRole("img", {
        name: /Revenue.*₹0 in total/i,
      })
    ).toBeTruthy();

    const statusChart = within(
      screen.getByRole("region", {
        name: "Appointments by status",
      })
    );

    expect(statusChart.getByText("PENDING")).toBeTruthy();

    // Today's schedule
    const today = within(
      await screen.findByRole("region", {
        name: "Today’s schedule",
      })
    );

    expect(await today.findByText("Rahul Verma")).toBeTruthy();
    expect(today.getByText("New patient")).toBeTruthy();
  });

  it("explains when there is no chart data yet", async () => {
    const emptyDashboard = {
      timezone: "Asia/Kolkata",
      range: "7d",
      summary: {
        totalPatients: 0,
        appointmentsToday: 0,
        pendingAppointments: 0,
        completedThisMonth: 0,
        revenuePaiseThisMonth: 0,
        paidTransactionsThisMonth: 0,
        currency: "inr",
      },
      charts: {
        bookingsByDay: [],
        revenueByDay: [],
        appointmentsByStatus: [],
      },
      upcomingSchedule: [],
    };

    api({
      "GET /owner/dashboard": () => jsonResponse(emptyDashboard),
    });

    renderRoutes(routes, "/owner");

    expect(
      (await screen.findAllByText(/No data yet/)).length
    ).toBeGreaterThanOrEqual(2);
  });

  it("offers a retry when the numbers fail to load", async () => {
    api({
      "GET /owner/dashboard": () =>
        jsonResponse(
          { error: "boom", code: "INTERNAL" },
          500
        ),
    });

    renderRoutes(routes, "/owner");

    expect(
      await screen.findByRole(
        "button",
        { name: "Try again" },
        { timeout: 4000 }
      )
    ).toBeTruthy();
  });
});

describe("schedule actions", () => {
  it("marks a started visit completed, and only offers that for visits that have started", async () => {
    const fetchMock = api();
    renderRoutes(routes, "/owner/appointments");

    const upcoming = await rowFor("Neha Patel");
    expect(
      within(upcoming).queryByRole("button", { name: "Mark completed" }),
    ).toBeNull();
    expect(
      within(upcoming).getByRole("button", { name: "Cancel" }),
    ).toBeTruthy();

    const started = await rowFor("Rahul Verma");
    fireEvent.click(
      within(started).getByRole("button", { name: "Mark completed" }),
    );

    await waitFor(() =>
      expect(body(fetchMock, "PATCH", "/owner/appointments/a_now")).toEqual({
        status: "COMPLETED",
      }),
    );
  });

  it("asks for a second press before cancelling", async () => {
    const fetchMock = api();
    renderRoutes(routes, "/owner/appointments");
    const row = await rowFor("Neha Patel");

    fireEvent.click(within(row).getByRole("button", { name: "Cancel" }));
    // nothing sent yet
    expect(body(fetchMock, "POST", "/owner/appointments/a_later/cancel")).toBeNull();

    fireEvent.click(within(row).getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() =>
      expect(body(fetchMock, "POST", "/owner/appointments/a_later/cancel")).toEqual({}),
    );
    // cancelling must not go through the status PATCH any more
    expect(body(fetchMock, "PATCH", "/owner/appointments/a_later")).toBeNull();
  });

  it("links a completed visit to the record form with details filled in", async () => {
    api();
    renderRoutes(routes, "/owner/appointments");
    const row = await rowFor("Priya Sharma");
    const href =
      within(row)
        .getByRole("link", { name: "Add record" })
        .getAttribute("href") ?? "";
    expect(href).toContain("patientId=p1");
    expect(href).toContain("appointmentId=a_done");
    expect(href).toContain("title=Teeth+Cleaning");
  });

  it("shows the server's message when a status change is refused", async () => {
    api({
      "PATCH /owner/appointments/": () =>
        jsonResponse(
          { error: "That change is not allowed", code: "CONFLICT" },
          409,
        ),
    });
    renderRoutes(routes, "/owner/appointments");
    const row = await rowFor("Rahul Verma");
    fireEvent.click(within(row).getByRole("button", { name: "No-show" }));
    expect(await screen.findByText("That change is not allowed")).toBeTruthy();
  });

  it("loads another day when the date changes", async () => {
    const fetchMock = api();
    renderRoutes(routes, "/owner/appointments");
    await screen.findByText("Rahul Verma");
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    const tomorrow = addDays(todayInClinic(), 1);
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([u]) =>
          String(u).includes(`/owner/schedule?date=${tomorrow}`)
        )
      ).toBe(true)
    );
  });
});

describe("patients", () => {
  it("lists and searches patients", async () => {
    api();
    renderRoutes(routes, "/owner/patients");
    expect(await screen.findByText("Priya Sharma")).toBeTruthy();
    expect(screen.getByText("Rahul Verma")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search patients"), {
      target: { value: "rahul" },
    });
    await waitFor(() => expect(screen.queryByText("Priya Sharma")).toBeNull());
    expect(
      screen
        .getByRole("link", { name: /Add record for Rahul Verma/ })
        .getAttribute("href"),
    ).toBe("/owner/records?patientId=p2");
  });
});

describe("records", () => {
  async function fillRecord() {
    await screen.findByRole("option", { name: /Priya Sharma/ });
    fireEvent.change(screen.getByLabelText("Patient *"), {
      target: { value: "p1" },
    });
    fireEvent.change(screen.getByLabelText("Title *"), {
      target: { value: "Dental Cleaning" },
    });
    fireEvent.change(screen.getByLabelText("What was done *"), {
      target: { value: "Routine scaling and polishing." },
    });
  }

  it("validates before saving", async () => {
    const fetchMock = api();
    renderRoutes(routes, "/owner/records");
    fireEvent.click(await screen.findByRole("button", { name: "Save record" }));
    await waitFor(() =>
      expect(document.getElementById("rec-patient-err")?.textContent).toBe(
        "Choose a patient",
      ),
    );
    expect(document.getElementById("rec-title-err")?.textContent).toBe(
      "Enter a short title",
    );
    expect(body(fetchMock, "POST", "/owner/records")).toBeNull();
  });

  it("saves a record opened from a visit, then offers a prescription for it", async () => {
    const fetchMock = api();
    renderRoutes(
      routes,
      "/owner/records?patientId=p1&appointmentId=a_done&title=Teeth%20Cleaning",
    );
    await screen.findByRole("option", { name: /Priya Sharma/ });
    fireEvent.change(screen.getByLabelText("What was done *"), {
      target: { value: "Routine scaling and polishing." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save record" }));

    expect(await screen.findByText("Treatment record saved")).toBeTruthy();
    expect(body(fetchMock, "POST", "/owner/records")).toMatchObject({
      patientId: "p1",
      appointmentId: "a_done",
      title: "Teeth Cleaning",
      summary: "Routine scaling and polishing.",
    });
    const link =
      screen
        .getByRole("link", { name: "Add a prescription" })
        .getAttribute("href") ?? "";
    expect(link).toContain("tab=prescription");
    expect(link).toContain("recordId=rec_1");
  });

  it("does not send empty optional fields", async () => {
    const fetchMock = api();
    renderRoutes(routes, "/owner/records");
    await fillRecord();
    fireEvent.click(screen.getByRole("button", { name: "Save record" }));
    await screen.findByText("Treatment record saved");
    const sent = body(fetchMock, "POST", "/owner/records");
    expect(sent).not.toHaveProperty("appointmentId");
    expect(sent).not.toHaveProperty("toothNo");
  });

  it("saves a prescription linked to the record", async () => {
    const fetchMock = api();
    renderRoutes(
      routes,
      "/owner/records?tab=prescription&patientId=p1&recordId=rec_1",
    );
    await screen.findByRole("option", { name: /Priya Sharma/ });
    fireEvent.change(screen.getByLabelText("Medicine *"), {
      target: { value: "Fluoride mouthwash" },
    });
    fireEvent.change(screen.getByLabelText("Instructions *"), {
      target: { value: "Rinse once daily for 2 weeks." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save prescription" }));

    expect(await screen.findByText("Prescription saved")).toBeTruthy();
    expect(body(fetchMock, "POST", "/owner/prescriptions")).toEqual({
      patientId: "p1",
      recordId: "rec_1",
      medicine: "Fluoride mouthwash",
      instructions: "Rinse once daily for 2 weeks.",
    });
  });
});

describe("hours and days off", () => {
  it("shows the saved week, defaults for missing days, and the blocked date", async () => {
    api();
    renderRoutes(routes, "/owner/settings");

    expect(
      ((await screen.findByLabelText("Monday opens")) as HTMLInputElement)
        .value,
    ).toBe("09:00");

    expect(
      (screen.getByLabelText("Monday break from") as HTMLInputElement).value,
    ).toBe("13:00");

    expect(
      (screen.getByLabelText("Sunday closed") as HTMLInputElement).checked,
    ).toBe(true);

    expect(
      (screen.getByLabelText("Sunday opens") as HTMLInputElement).disabled,
    ).toBe(true);

    expect(
      (screen.getByLabelText("Tuesday opens") as HTMLInputElement).value,
    ).toBe("09:00");

    expect(screen.getByText("Holiday")).toBeTruthy();

    expect(
      (screen.getByRole("button", {
        name: "Save changes",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("saves edited hours and a new day off", async () => {
    const fetchMock = api();

    renderRoutes(routes, "/owner/settings");

    // Edit Monday's opening time.
    fireEvent.change(await screen.findByLabelText("Monday opens"), {
      target: { value: "10:00" },
    });

    // Add a new day off.
    const newBlockedDate = addDays(todayInClinic(), 10);

    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: newBlockedDate },
    });

    fireEvent.change(screen.getByLabelText("Reason (optional)"), {
      target: { value: "Conference" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add day off" }));

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Verify the individual weekday update.
    await waitFor(() => {
      expect(
        body(fetchMock, "PUT", "/owner/working-hours/1"),
      ).toMatchObject({
        startTime: "10:00",
        endTime: "19:00",
        breakStart: "13:00",
        breakEnd: "14:00",
        slotMinutes: 30,
        isOff: false,
      });

      expect(
        body(fetchMock, "POST", "/owner/blocked-dates"),
      ).toEqual({
        date: newBlockedDate,
        reason: "Conference",
      });
    });

    // Only Monday should require a working-hours update.
    const workingHoursUpdates = fetchMock.mock.calls.filter(
      ([url, init]) =>
        String(url).includes("/owner/working-hours/") &&
        init?.method === "PUT",
    );

    expect(workingHoursUpdates).toHaveLength(1);

    // Confirm the save message.
    expect(
      await screen.findByText(
        /Saved\. New bookings follow these hours/,
      ),
    ).toBeTruthy();
  });

  it("blocks saving when closing is before opening", async () => {
    const fetchMock = api();

    renderRoutes(routes, "/owner/settings");

    fireEvent.change(await screen.findByLabelText("Monday opens"), {
      target: { value: "20:00" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText(/Closing time must be after opening time/),
    ).toBeTruthy();

    // No write request should be sent for invalid form data.
    const writeRequests = fetchMock.mock.calls.filter(
      ([, init]) =>
        ["PUT", "POST", "DELETE"].includes(init?.method ?? ""),
    );

    expect(writeRequests).toHaveLength(0);
  });

  it("removes a day off", async () => {
    const fetchMock = api();

    renderRoutes(routes, "/owner/settings");

    // Remove the existing December 25 holiday.
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Remove .*25 December 2026/,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // The backend should receive DELETE for that date.
    await waitFor(() => {
      const deleteRequest = fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url).includes("/owner/blocked-dates/2026-12-25") &&
          init?.method === "DELETE",
      );

      expect(deleteRequest).toBe(true);
    });

    expect(
      await screen.findByText(
        /Saved\. New bookings follow these hours/,
      ),
    ).toBeTruthy();
  });

  it("shows the server's message when saving fails", async () => {
    api({
      "PUT /owner/working-hours/": () =>
        jsonResponse(
          {
            error: "Could not save the hours",
            code: "VALIDATION_ERROR",
          },
          422,
        ),
    });

    renderRoutes(routes, "/owner/settings");

    fireEvent.change(await screen.findByLabelText("Monday opens"), {
      target: { value: "10:00" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Could not save the hours"),
    ).toBeTruthy();
  });
});
