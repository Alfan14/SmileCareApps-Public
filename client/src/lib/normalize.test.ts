import { describe, expect, it } from "vitest";
import { appointmentsFrom, invoiceFrom, invoicesFrom, prescriptionsFrom, recordsFrom } from "./normalize";

describe("appointmentsFrom", () => {
    it("reads a wrapped list with nested treatment, payment and invoice", () => {
    const list = appointmentsFrom({
      appointments: [
        {
          id: "a1",
          startTime: "2026-11-03T04:30:00.000Z",
          endTime: "2026-11-03T05:15:00.000Z",
          status: "confirmed",
          consultationType: "VIDEO",
          meetLink: "https://meet.google.com/abc-defg-hij",
          treatment: { name: "Teeth Cleaning", slug: "teeth-cleaning" },
          payment: { status: "PAID", amount: 150000 },
          invoice: { id: "i1", number: "INV-2026-0001" },
        },
      ],
    });
    expect(list).toEqual([
      {
        id: "a1",
        startTime: "2026-11-03T04:30:00.000Z",
        endTime: "2026-11-03T05:15:00.000Z",
        status: "CONFIRMED",
        consultationType: "VIDEO",
        meetLink: "https://meet.google.com/abc-defg-hij",
        holdExpiresAt: null,
        treatmentId: null,
        treatmentName: "Teeth Cleaning",
        treatmentSlug: "teeth-cleaning",
        paymentStatus: "PAID",
        paymentFailureReason: null,
        invoiceId: "i1",
        invoiceNumber: "INV-2026-0001",
        amount: 150000,
        cancelReason: null,
        rescheduleCount: 0,
        reviewId: null,
      },
    ]);
  });

  it("reads a bare list with flat fields and applies safe defaults", () => {
    const [a] = appointmentsFrom([{ id: "a2", startTime: "2026-11-04T05:00:00.000Z", treatmentName: "Root Canal", status: "weird" }]);
    expect(a).toMatchObject({ treatmentName: "Root Canal", status: "PENDING", consultationType: "IN_CLINIC", meetLink: null, invoiceId: null });
  });

  it("skips entries without an id or start time and tolerates junk", () => {
    expect(appointmentsFrom([{ id: "x" }, { startTime: "2026-11-04T05:00:00.000Z" }, null, "text", 5])).toEqual([]);
    expect(appointmentsFrom(null)).toEqual([]);
    expect(appointmentsFrom({ appointments: "nope" })).toEqual([]);
  });
});

describe("records and prescriptions", () => {
  it("normalizes records", () => {
    expect(recordsFrom({ records: [{ id: "r1", title: "Cleaning", summary: "Gums healthy", toothNo: 16, date: "2026-10-01T00:00:00.000Z" }] })).toEqual([
      { id: "r1", title: "Cleaning", summary: "Gums healthy", toothNo: "16", date: "2026-10-01T00:00:00.000Z", appointmentId: null },
    ]);
  });

  it("normalizes prescriptions and needs a medicine name", () => {
    const list = prescriptionsFrom({ prescriptions: [{ id: "p1", medicine: "Fluoride mouthwash", instructions: "Once daily", record: { title: "Cleaning" } }, { id: "p2" }] });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ medicine: "Fluoride mouthwash", recordTitle: "Cleaning", date: null });
  });
});

describe("invoices", () => {
  it("reads flat invoices", () => {
    const [inv] = invoicesFrom([{ id: "i1", number: "INV-1", issuedAt: "2026-10-01T00:00:00.000Z", amount: 150000, description: "Teeth cleaning", status: "PAID" }]);
    expect(inv).toMatchObject({ number: "INV-1", amount: 150000, description: "Teeth cleaning", status: "PAID" });
  });

  it("reads invoices nested under payment and appointment", () => {
    const [inv] = invoicesFrom({
      invoices: [{ id: "i2", number: "INV-2", payment: { status: "PAID", amount: 400000, paidAt: "2026-10-02T00:00:00.000Z", appointment: { treatment: { name: "Whitening" } } } }],
    });
    expect(inv).toMatchObject({ amount: 400000, issuedAt: "2026-10-02T00:00:00.000Z", description: "Whitening", status: "PAID" });
  });

  it("reads one invoice, wrapped or not", () => {
    expect(invoiceFrom({ invoice: { id: "i1", number: "INV-1", patient: { name: "Priya", email: "p@example.com" } } })).toMatchObject({ id: "i1", patientName: "Priya" });
    expect(invoiceFrom({ id: "i1", number: "INV-1" })).toMatchObject({ id: "i1" });
    expect(invoiceFrom({ error: "nope" })).toBeNull();
  });
});
