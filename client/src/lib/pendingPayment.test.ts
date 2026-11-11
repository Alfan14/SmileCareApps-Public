import { afterEach, describe, expect, it } from "vitest";
import { clearPendingPayment, loadPendingPayment, savePendingPayment } from "./pendingPayment";
import type { PendingPayment } from "./pendingPayment";

const value: PendingPayment = {
  appointmentId: "apt_1",
  treatmentName: "Teeth Cleaning",
  slotStart: "2026-11-03T04:30:00.000Z",
  consultationType: "IN_CLINIC",
  bookingPrice: 150000,
  holdExpiresAt: "2026-11-03T04:40:00.000Z",
};

afterEach(() => sessionStorage.clear());

describe("pendingPayment", () => {
  it("saves, loads and clears", () => {
    expect(loadPendingPayment()).toBeNull();
    savePendingPayment(value);
    expect(loadPendingPayment()).toEqual(value);
    clearPendingPayment();
    expect(loadPendingPayment()).toBeNull();
  });

  it("ignores corrupted or tampered data", () => {
    sessionStorage.setItem("sc_pending_payment", "{not json");
    expect(loadPendingPayment()).toBeNull();
    sessionStorage.setItem("sc_pending_payment", JSON.stringify({ ...value, bookingPrice: "free" }));
    expect(loadPendingPayment()).toBeNull();
  });
});
