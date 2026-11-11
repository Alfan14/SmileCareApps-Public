import { describe, expect, it } from "vitest";
import type { MyAppointment } from "../types/api";
import { groupAppointments, isAwaitingPayment, nextAppointment, statusLabel, tabOf } from "./appointments";

const NOW = Date.parse("2026-11-01T10:00:00.000Z");
const make = (over: Partial<MyAppointment>): MyAppointment => ({
  id: "a",
  startTime: "2026-11-05T05:00:00.000Z",
  endTime: null,
  status: "CONFIRMED",
  consultationType: "IN_CLINIC",
  meetLink: null,
  holdExpiresAt: null,
  treatmentName: "Teeth Cleaning",
  treatmentSlug: null,
  paymentStatus: null,
  invoiceId: null,
  invoiceNumber: null,
  amount: null,
  ...over,
});

describe("tabOf", () => {
  it("puts future confirmed visits in upcoming and past ones in past", () => {
    expect(tabOf(make({}), NOW)).toBe("upcoming");
    expect(tabOf(make({ startTime: "2026-10-20T05:00:00.000Z" }), NOW)).toBe("past");
  });

  it("handles finished and cancelled statuses", () => {
    expect(tabOf(make({ status: "COMPLETED" }), NOW)).toBe("past");
    expect(tabOf(make({ status: "NO_SHOW" }), NOW)).toBe("past");
    expect(tabOf(make({ status: "CANCELLED" }), NOW)).toBe("cancelled");
  });

  it("keeps a held slot upcoming only while the hold lasts", () => {
    const active = make({ status: "PENDING", holdExpiresAt: "2026-11-01T10:05:00.000Z" });
    const expired = make({ status: "PENDING", holdExpiresAt: "2026-11-01T09:55:00.000Z" });
    expect(isAwaitingPayment(active, NOW)).toBe(true);
    expect(tabOf(active, NOW)).toBe("upcoming");
    expect(isAwaitingPayment(expired, NOW)).toBe(false);
    expect(tabOf(expired, NOW)).toBe("cancelled");
    expect(statusLabel(expired, NOW)).toBe("Expired");
    expect(statusLabel(active, NOW)).toBe("Awaiting payment");
  });
});

describe("groupAppointments and nextAppointment", () => {
  const list = [
    make({ id: "later", startTime: "2026-11-20T05:00:00.000Z" }),
    make({ id: "soon", startTime: "2026-11-03T05:00:00.000Z" }),
    make({ id: "old1", status: "COMPLETED", startTime: "2026-09-01T05:00:00.000Z" }),
    make({ id: "old2", status: "COMPLETED", startTime: "2026-10-01T05:00:00.000Z" }),
    make({ id: "gone", status: "CANCELLED" }),
  ];

  it("sorts upcoming soonest-first and past newest-first", () => {
    const g = groupAppointments(list, NOW);
    expect(g.upcoming.map((a) => a.id)).toEqual(["soon", "later"]);
    expect(g.past.map((a) => a.id)).toEqual(["old2", "old1"]);
    expect(g.cancelled.map((a) => a.id)).toEqual(["gone"]);
  });

  it("finds the next confirmed appointment, or none", () => {
    expect(nextAppointment(list, NOW)?.id).toBe("soon");
    expect(nextAppointment([make({ status: "CANCELLED" })], NOW)).toBeNull();
  });
});
