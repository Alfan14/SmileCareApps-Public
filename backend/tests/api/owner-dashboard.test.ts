import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "test-session-secret-must-be-at-least-32-chars";
  process.env.CLIENT_URL = "http://localhost:5173";
  process.env.APP_URL = "http://localhost:5173";
  process.env.CLINIC_TIMEZONE = "Asia/Kolkata";
});

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { count: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    appointment: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    payment: { aggregate: vi.fn(), findMany: vi.fn() },
    workingHours: { findMany: vi.fn(), upsert: vi.fn() },
    blockedDate: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    treatmentRecord: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../../src/config/prisma", () => ({ prisma: mocks.prisma }));

import { app } from "../../src/app";
import { SESSION_COOKIE } from "../../src/middleware/auth.middleware";

const secret = "test-session-secret-must-be-at-least-32-chars";
function cookieFor(role: "PATIENT" | "OWNER", id = role === "OWNER" ? "owner-1" : "patient-1") {
  const token = jwt.sign({ role }, secret, {
    subject: id, expiresIn: "1h", issuer: "smilecare-api", audience: "smilecare-client",
  });
  return `${SESSION_COOKIE}=${token}`;
}
const ownerCookie = cookieFor("OWNER");

beforeEach(() => {
  vi.resetAllMocks();
  mocks.prisma.user.count.mockResolvedValue(12);
  mocks.prisma.user.findFirst.mockResolvedValue({ id: "patient-1" });
  mocks.prisma.user.findMany.mockResolvedValue([{ id: "patient-1", name: "Priya Sharma", email: "patient@smilecare.test", phone: null, createdAt: new Date() }]);
  mocks.prisma.appointment.count.mockResolvedValue(0);
  mocks.prisma.appointment.findMany.mockResolvedValue([]);
  mocks.prisma.appointment.findFirst.mockResolvedValue({ id: "appointment-1", status: "COMPLETED" });
  mocks.prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 125000 }, _count: { _all: 5 } });
  mocks.prisma.payment.findMany.mockResolvedValue([]);
  mocks.prisma.workingHours.findMany.mockResolvedValue([]);
  mocks.prisma.workingHours.upsert.mockImplementation(async ({ where, update, create }: any) => ({ dayOfWeek: where.dayOfWeek, ...(update ?? create) }));
  mocks.prisma.blockedDate.findMany.mockResolvedValue([]);
  mocks.prisma.blockedDate.create.mockImplementation(async ({ data }: any) => data);
  mocks.prisma.blockedDate.delete.mockResolvedValue({ date: new Date("2030-01-01T00:00:00.000Z"), reason: "holiday" });
  mocks.prisma.treatmentRecord.count.mockResolvedValue(0);
  mocks.prisma.treatmentRecord.findMany.mockResolvedValue([]);
  mocks.prisma.treatmentRecord.create.mockImplementation(async ({ data }: any) => ({ id: "record-1", ...data, prescriptions: [] }));
});

describe("owner dashboard access control", () => {
  it("requires a valid session", async () => {
    const res = await request(app).get("/api/owner/dashboard");
    expect(res.status).toBe(401);
    expect(mocks.prisma.user.count).not.toHaveBeenCalled();
  });

  it("rejects PATIENT role on owner endpoints", async () => {
    const res = await request(app).get("/api/owner/dashboard").set("Cookie", cookieFor("PATIENT"));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
    expect(mocks.prisma.user.count).not.toHaveBeenCalled();
  });

  it("returns KPI, daily chart arrays and upcoming schedule", async () => {
    mocks.prisma.appointment.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2).mockResolvedValueOnce(4);
    mocks.prisma.appointment.findMany.mockResolvedValueOnce([
      { startTime: new Date(), status: "CONFIRMED" },
      { startTime: new Date(), status: "COMPLETED" },
    ]).mockResolvedValueOnce([{ id: "appt-1", status: "CONFIRMED" }]);
    mocks.prisma.payment.findMany.mockResolvedValue([{ amount: 125000, paidAt: new Date() }]);

    const res = await request(app).get("/api/owner/dashboard?range=7d").set("Cookie", ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({
      totalPatients: 12, appointmentsToday: 3, pendingAppointments: 2,
      completedThisMonth: 4, revenuePaiseThisMonth: 125000, paidTransactionsThisMonth: 5, currency: "inr",
    });
    expect(res.body.charts.bookingsByDay).toHaveLength(7);
    expect(res.body.charts.revenueByDay).toHaveLength(7);
    expect(res.body.upcomingSchedule).toHaveLength(1);
    expect(mocks.prisma.user.count).toHaveBeenCalledWith({ where: { role: "PATIENT" } });
  });

  it("rejects invalid dashboard range", async () => {
    const res = await request(app).get("/api/owner/dashboard?range=365d").set("Cookie", ownerCookie);
    expect(res.status).toBe(422);
  });
});

describe("owner schedule and working hours", () => {
  it("lists schedule with date range and pagination", async () => {
    mocks.prisma.appointment.count.mockResolvedValue(21);
    mocks.prisma.appointment.findMany.mockResolvedValue([{ id: "appt-1" }]);
    const res = await request(app).get("/api/owner/schedule?from=2026-10-28&to=2026-10-29&status=CONFIRMED&page=2&limit=10")
      .set("Cookie", ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({ page: 2, limit: 10, total: 21, totalPages: 3 });
    expect(mocks.prisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10, where: expect.objectContaining({ status: "CONFIRMED" }) }));
  });

  it("lists weekly working hours", async () => {
    mocks.prisma.workingHours.findMany.mockResolvedValue([{ dayOfWeek: 1, startTime: "09:00", endTime: "19:00" }]);
    const res = await request(app).get("/api/owner/working-hours").set("Cookie", ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(mocks.prisma.workingHours.findMany).toHaveBeenCalledWith({ orderBy: { dayOfWeek: "asc" } });
  });

  it("updates a day with validated working hours", async () => {
    const res = await request(app).put("/api/owner/working-hours/1").set("Cookie", ownerCookie)
      .set("Origin", "http://localhost:5173")
      .send({ startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00", slotMinutes: 30, isOff: false });
    expect(res.status).toBe(200);
    expect(mocks.prisma.workingHours.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { dayOfWeek: 1 }, update: expect.objectContaining({ startTime: "09:00", endTime: "18:00" }),
    }));
  });

  it("rejects invalid break or end time before hitting the database", async () => {
    const res = await request(app).put("/api/owner/working-hours/1").set("Cookie", ownerCookie)
      .set("Origin", "http://localhost:5173")
      .send({ startTime: "10:00", endTime: "09:00", breakStart: "13:00", breakEnd: "14:00", slotMinutes: 30, isOff: false });
    expect(res.status).toBe(422);
    expect(mocks.prisma.workingHours.upsert).not.toHaveBeenCalled();
  });
});

describe("owner blocked dates", () => {
  it("lists blocked dates", async () => {
    mocks.prisma.blockedDate.findMany.mockResolvedValue([{ date: new Date("2030-01-01T00:00:00.000Z"), reason: "holiday" }]);
    const res = await request(app).get("/api/owner/blocked-dates?from=2030-01-01&to=2030-01-31").set("Cookie", ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data[0].reason).toBe("holiday");
  });

  it("does not block a date with pending or confirmed appointments", async () => {
    mocks.prisma.appointment.count.mockResolvedValue(1);
    const res = await request(app).post("/api/owner/blocked-dates").set("Cookie", ownerCookie)
      .set("Origin", "http://localhost:5173").send({ date: "2030-02-01", reason: "Holiday" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("DATE_HAS_BOOKINGS");
    expect(mocks.prisma.blockedDate.create).not.toHaveBeenCalled();
  });

  it("creates and deletes an unoccupied blocked date", async () => {
    mocks.prisma.appointment.count.mockResolvedValue(0);
    mocks.prisma.blockedDate.create.mockResolvedValue({ date: new Date("2030-02-01T00:00:00.000Z"), reason: "Holiday" });
    const created = await request(app).post("/api/owner/blocked-dates").set("Cookie", ownerCookie)
      .set("Origin", "http://localhost:5173").send({ date: "2030-02-01", reason: "Holiday" });
    expect(created.status).toBe(201);
    expect(mocks.prisma.blockedDate.create).toHaveBeenCalledOnce();

    const removed = await request(app).delete("/api/owner/blocked-dates/2030-02-01").set("Cookie", ownerCookie)
      .set("Origin", "http://localhost:5173");
    expect(removed.status).toBe(200);
    expect(removed.body.deleted).toBe(true);
    expect(mocks.prisma.blockedDate.delete).toHaveBeenCalledOnce();
  });
});

describe("owner patient lookup and treatment records", () => {
  it("lists only PATIENT accounts and supports search", async () => {
    const res = await request(app).get("/api/owner/patients?search=priya&page=1&limit=10").set("Cookie", ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe("patient-1");
    expect(mocks.prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ role: "PATIENT", OR: expect.any(Array) }),
      skip: 0, take: 10,
    }));
  });

  it("lists records with optional patient filter", async () => {
    mocks.prisma.treatmentRecord.count.mockResolvedValue(1);
    mocks.prisma.treatmentRecord.findMany.mockResolvedValue([{ id: "record-1", patientId: "patient-1" }]);
    const res = await request(app).get("/api/owner/records?patientId=patient-1&page=1&limit=10").set("Cookie", ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(1);
    expect(mocks.prisma.treatmentRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { patientId: "patient-1" } }));
  });

  it("creates a treatment record and prescriptions for a valid patient", async () => {
    mocks.prisma.treatmentRecord.create.mockResolvedValue({ id: "record-1", title: "Routine check", prescriptions: [{ id: "rx-1" }] });
    const res = await request(app).post("/api/owner/records").set("Cookie", ownerCookie).set("Origin", "http://localhost:5173")
      .send({ patientId: "patient-1", title: "Routine check", summary: "No acute issues noted.", prescriptions: [{ medicine: "Example rinse", instructions: "Use once daily" }] });
    expect(res.status).toBe(201);
    expect(res.body.record.id).toBe("record-1");
    expect(mocks.prisma.treatmentRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ patientId: "patient-1", prescriptions: { create: [expect.objectContaining({ patientId: "patient-1", medicine: "Example rinse" })] } }),
    }));
  });

  it("rejects linking a record to another patient's appointment", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/api/owner/records").set("Cookie", ownerCookie).set("Origin", "http://localhost:5173")
      .send({ patientId: "patient-1", appointmentId: "appointment-other", title: "Check", summary: "Details" });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("APPOINTMENT_NOT_FOUND");
    expect(mocks.prisma.treatmentRecord.create).not.toHaveBeenCalled();
  });

  it("rejects creating a linked treatment record before appointment is completed", async () => {
    mocks.prisma.appointment.findFirst.mockResolvedValue({ id: "appointment-1", status: "CONFIRMED" });
    const res = await request(app).post("/api/owner/records").set("Cookie", ownerCookie).set("Origin", "http://localhost:5173")
      .send({ patientId: "patient-1", appointmentId: "appointment-1", title: "Check", summary: "Details" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("APPOINTMENT_NOT_COMPLETED");
    expect(mocks.prisma.treatmentRecord.create).not.toHaveBeenCalled();
  });

  it("rejects record creation from PATIENT role", async () => {
    const res = await request(app).post("/api/owner/records").set("Cookie", cookieFor("PATIENT"))
      .send({ patientId: "patient-1", title: "Check", summary: "Details" });
    expect(res.status).toBe(403);
    expect(mocks.prisma.treatmentRecord.create).not.toHaveBeenCalled();
  });
});
