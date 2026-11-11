import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "test-session-secret-must-be-at-least-32-chars";
  process.env.CLIENT_URL = "http://localhost:5173";
  process.env.APP_URL = "http://localhost:5173";
});

const mocks = vi.hoisted(() => ({
  prisma: {
    appointment: { count: vi.fn(), findMany: vi.fn() },
    treatmentRecord: { count: vi.fn(), findMany: vi.fn() },
    prescription: { count: vi.fn(), findMany: vi.fn() },
    invoice: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock("../../src/config/prisma", () => ({ prisma: mocks.prisma }));

import { app } from "../../src/app";
import { SESSION_COOKIE } from "../../src/middleware/auth.middleware";

const secret = "test-session-secret-must-be-at-least-32-chars";
const patientId = "patient-100";
function cookieFor(role: "PATIENT" | "OWNER", id = patientId) {
  const token = jwt.sign({ role }, secret, {
    subject: id,
    expiresIn: "1h",
    issuer: "smilecare-api",
    audience: "smilecare-client",
  });
  return `${SESSION_COOKIE}=${token}`;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.prisma.appointment.count.mockResolvedValue(0);
  mocks.prisma.appointment.findMany.mockResolvedValue([]);
  mocks.prisma.treatmentRecord.count.mockResolvedValue(0);
  mocks.prisma.treatmentRecord.findMany.mockResolvedValue([]);
  mocks.prisma.prescription.count.mockResolvedValue(0);
  mocks.prisma.prescription.findMany.mockResolvedValue([]);
  mocks.prisma.invoice.count.mockResolvedValue(0);
  mocks.prisma.invoice.findMany.mockResolvedValue([]);
  mocks.prisma.invoice.findFirst.mockResolvedValue(null);
});

describe("patient dashboard authentication and isolation", () => {
  it("rejects dashboard access without a session", async () => {
    const res = await request(app).get("/api/patient/dashboard");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
    expect(mocks.prisma.appointment.count).not.toHaveBeenCalled();
  });

  it("blocks OWNER role from patient-only dashboard endpoints", async () => {
    const res = await request(app).get("/api/patient/records").set("Cookie", cookieFor("OWNER", "owner-1"));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
    expect(mocks.prisma.treatmentRecord.findMany).not.toHaveBeenCalled();
  });

  it("builds dashboard counts and upcoming appointments scoped to the session patient", async () => {
    mocks.prisma.appointment.count.mockResolvedValueOnce(2).mockResolvedValueOnce(4);
    mocks.prisma.treatmentRecord.count.mockResolvedValue(3);
    mocks.prisma.prescription.count.mockResolvedValue(5);
    mocks.prisma.invoice.count.mockResolvedValue(2);
    mocks.prisma.appointment.findMany.mockResolvedValue([{ id: "appt-1", status: "CONFIRMED" }]);

    const res = await request(app).get("/api/patient/dashboard").set("Cookie", cookieFor("PATIENT"));

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({
      upcomingAppointments: 2,
      completedAppointments: 4,
      records: 3,
      prescriptions: 5,
      invoices: 2,
    });
    expect(mocks.prisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ patientId }),
      take: 5,
    }));
    expect(mocks.prisma.invoice.count).toHaveBeenCalledWith({
      where: { payment: { is: { status: "PAID", appointment: { is: { patientId } } } } },
    });
  });
});

describe("GET /api/patient/appointments", () => {
  it("scopes query to the signed-in patient and supports status and pagination", async () => {
    mocks.prisma.appointment.count.mockResolvedValue(31);
    mocks.prisma.appointment.findMany.mockResolvedValue([{ id: "appt-1", status: "CONFIRMED" }]);

    const res = await request(app).get("/api/patient/appointments?page=2&limit=10&status=CONFIRMED")
      .set("Cookie", cookieFor("PATIENT"));

    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({ page: 2, limit: 10, total: 31, totalPages: 4 });
    expect(mocks.prisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { patientId, status: "CONFIRMED" }, skip: 10, take: 10,
    }));
  });

  it("rejects an invalid status or page size", async () => {
    const invalidStatus = await request(app).get("/api/patient/appointments?status=HACKED")
      .set("Cookie", cookieFor("PATIENT"));
    const invalidLimit = await request(app).get("/api/patient/appointments?limit=1000")
      .set("Cookie", cookieFor("PATIENT"));
    expect(invalidStatus.status).toBe(422);
    expect(invalidLimit.status).toBe(422);
    expect(mocks.prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it("does not allow a query parameter to override patient identity", async () => {
    const res = await request(app).get("/api/patient/appointments?patientId=another-patient")
      .set("Cookie", cookieFor("PATIENT"));
    expect(res.status).toBe(200);
    expect(mocks.prisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { patientId },
    }));
  });
});

describe("GET /api/patient/records and /prescriptions", () => {
  it("lists only records belonging to the authenticated patient", async () => {
    mocks.prisma.treatmentRecord.count.mockResolvedValue(1);
    mocks.prisma.treatmentRecord.findMany.mockResolvedValue([{ id: "record-1", patientId }]);
    const res = await request(app).get("/api/patient/records?page=1&limit=5").set("Cookie", cookieFor("PATIENT"));
    expect(res.status).toBe(200);
    expect(mocks.prisma.treatmentRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { patientId }, skip: 0, take: 5,
    }));
  });

  it("lists only prescriptions belonging to the authenticated patient", async () => {
    mocks.prisma.prescription.findMany.mockResolvedValue([{ id: "rx-1", medicine: "Example", patientId }]);
    const res = await request(app).get("/api/patient/prescriptions").set("Cookie", cookieFor("PATIENT"));
    expect(res.status).toBe(200);
    expect(mocks.prisma.prescription.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { patientId } }));
  });
});

describe("GET /api/patient/invoices", () => {
  it("lists paid invoices joined through the current patient's appointment", async () => {
    mocks.prisma.invoice.findMany.mockResolvedValue([{ id: "invoice-1", number: "INV-2026-0001" }]);
    const res = await request(app).get("/api/patient/invoices").set("Cookie", cookieFor("PATIENT"));
    expect(res.status).toBe(200);
    expect(mocks.prisma.invoice.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { payment: { is: { status: "PAID", appointment: { is: { patientId } } } } },
    }));
  });

  it("returns 404 for an invoice that is not owned by the current patient", async () => {
    const res = await request(app).get("/api/patient/invoices/private-invoice-2").set("Cookie", cookieFor("PATIENT"));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("INVOICE_NOT_FOUND");
    expect(mocks.prisma.invoice.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "private-invoice-2",
        payment: { is: { status: "PAID", appointment: { is: { patientId } } } },
      },
    }));
  });
});
