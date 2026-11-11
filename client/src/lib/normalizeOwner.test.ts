import { describe, expect, it } from "vitest";
import { ownerAppointmentsFrom, ownerPatientsFrom, availabilityFrom, createdIdFrom, statsFrom } from "./normalizeOwner";

describe("ownerAppointmentsFrom", () => {
  it("adds patient details to the appointment fields", () => {
    const [a] = ownerAppointmentsFrom({
      appointments: [
        {
          id: "a1",
          startTime: "2026-11-03T04:30:00.000Z",
          status: "CONFIRMED",
          isNewPatient: true,
          treatment: { name: "Teeth Cleaning" },
          patient: { id: "p1", name: "Priya Sharma", phone: "+911234567890", email: "priya@example.com" },
        },
      ],
    });
    expect(a).toMatchObject({ id: "a1", treatmentName: "Teeth Cleaning", patientId: "p1", patientName: "Priya Sharma", patientPhone: "+911234567890", isNewPatient: true });
  });

  it("accepts flat patient fields and a bare list", () => {
    const [a] = ownerAppointmentsFrom([{ id: "a2", startTime: "2026-11-03T05:00:00.000Z", patientName: "Rahul K." }]);
    expect(a).toMatchObject({ patientName: "Rahul K.", patientId: null, isNewPatient: false });
  });
});

describe("ownerPatientsFrom", () => {
  it("reads counts flat or from a Prisma-style _count", () => {
    const list = ownerPatientsFrom({ patients: [{ id: "p1", name: "Priya", email: "p@example.com", _count: { appointments: 3 } }, { id: "p2", name: "Rahul", email: "r@example.com", appointmentCount: 1 }, { name: "no id" }] });
    expect(list.map((p) => p.appointmentCount)).toEqual([3, 1]);
  });
});

describe("statsFrom", () => {
  it("normalizes the current owner dashboard response", () => {
    const s = statsFrom({
      timezone: "Asia/Kolkata",
      range: "7d",

      summary: {
        totalPatients: 4,
        appointmentsToday: 0,
        pendingAppointments: 3,
        completedThisMonth: 0,
        revenuePaiseThisMonth: 0,
        paidTransactionsThisMonth: 0,
        currency: "inr",
      },

      charts: {
        bookingsByDay: [
          { date: "2026-10-29", count: 1 },
          { date: "2026-10-30", count: 0 },
        ],

        revenueByDay: [
          {
            date: "2026-10-29",
            revenuePaise: 0,
            currency: "inr",
          },
        ],

        appointmentsByStatus: [
          { status: "PENDING", count: 3 },
        ],
      },

      upcomingSchedule: [],
    });

    expect(s.timezone).toBe("Asia/Kolkata");
    expect(s.range).toBe("7d");

    expect(s.summary).toEqual({
      totalPatients: 4,
      appointmentsToday: 0,
      pendingAppointments: 3,
      completedThisMonth: 0,
      revenuePaiseThisMonth: 0,
      paidTransactionsThisMonth: 0,
      currency: "inr",
    });

    expect(s.bookingsByDay).toEqual([
      { date: "2026-10-29", count: 1 },
      { date: "2026-10-30", count: 0 },
    ]);

    expect(s.revenueByDay).toEqual([
      {
        date: "2026-10-29",
        revenuePaise: 0,
        currency: "inr",
      },
    ]);

    expect(s.appointmentsByStatus).toEqual([
      { name: "PENDING", count: 3 },
    ]);

    expect(s.upcomingSchedule).toEqual([]);
  });

  it("handles missing dashboard data safely", () => {
    const s = statsFrom(null);

    expect(s.timezone).toBe("");
    expect(s.range).toBe("");

    expect(s.summary).toEqual({
      totalPatients: null,
      appointmentsToday: null,
      pendingAppointments: null,
      completedThisMonth: null,
      revenuePaiseThisMonth: null,
      paidTransactionsThisMonth: null,
      currency: "inr",
    });

    expect(s.bookingsByDay).toEqual([]);
    expect(s.revenueByDay).toEqual([]);
    expect(s.appointmentsByStatus).toEqual([]);
    expect(s.upcomingSchedule).toEqual([]);
  });
});

describe("availabilityFrom", () => {
  it("returns all seven days Monday first, filling gaps with defaults", () => {
    const a = availabilityFrom({ workingHours: [{ dayOfWeek: 1, startTime: "10:00:00", endTime: "17:00", breakStart: null, breakEnd: null, slotMinutes: 20, isOff: false }, { dayOfWeek: 0, isOff: true }] });
    expect(a.workingHours.map((d) => d.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(a.workingHours[0]).toEqual({ dayOfWeek: 1, isOff: false, startTime: "10:00", endTime: "17:00", breakStart: null, breakEnd: null, slotMinutes: 20 });
    expect(a.workingHours[1]).toMatchObject({ dayOfWeek: 2, startTime: "09:00", isOff: false }); // default
    expect(a.workingHours[6]).toMatchObject({ dayOfWeek: 0, isOff: true });
  });

  it("keeps blocked dates as clinic dates, sorted", () => {
    const a = availabilityFrom({ blockedDates: [{ date: "2026-12-25", reason: "Holiday" }, { date: "2026-11-02T18:30:00.000Z", reason: null }] });
    expect(a.blockedDates).toEqual([{ date: "2026-11-03", reason: "" }, { date: "2026-12-25", reason: "Holiday" }]);
  });
});

describe("createdIdFrom", () => {
  it("finds the new id, wrapped or not", () => {
    expect(createdIdFrom({ record: { id: "r1" } }, "record")).toBe("r1");
    expect(createdIdFrom({ id: "r2" }, "record")).toBe("r2");
    expect(createdIdFrom({ ok: true }, "record")).toBeNull();
  });
});
