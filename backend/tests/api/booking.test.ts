import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "test-session-secret-must-be-at-least-32-chars";
  process.env.CLIENT_URL = "http://localhost:5173";
});2

const mocks = vi.hoisted(() => {
  const txAppointment = { findFirst: vi.fn(), create: vi.fn() };
  const prismaMock = {
    treatment: { findFirst: vi.fn(), findMany: vi.fn() },
    workingHours: { findUnique: vi.fn() },
    blockedDate: { findUnique: vi.fn() },
    appointment: { findMany: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  };
  return { txAppointment, prismaMock };
});

vi.mock("../../src/config/prisma", () => ({ prisma: mocks.prismaMock }));

import { app } from "../../src/app";
import { SESSION_COOKIE } from "../../src/middleware/auth.middleware";
import { releaseExpiredHolds } from "../../src/services/appointments.service";

const secret = "test-session-secret-must-be-at-least-32-chars";
const treatment = { id: "treatment-cleaning", durationMin: 30, active: true };
const workingHours = {
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "19:00",
  breakStart: "13:00",
  breakEnd: "14:00",
  slotMinutes: 30,
  isOff: false,
};
const testPatientId = "patient-test-1";

function clinicDateInTwoDays(): string {
  const inTwoDays = new Date(Date.now() + 48 * 60 * 60 * 1000);
  return new Date(inTwoDays.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

function clinicTime(date: string, hhmm: string): string {
  return `${date}T${hhmm}:00+05:30`;
}

function sessionCookie(role: "PATIENT" | "OWNER" = "PATIENT", userId = testPatientId): string {
  const token = jwt.sign({ role }, secret, {
    subject: userId,
    expiresIn: "1h",
    issuer: "smilecare-api",
    audience: "smilecare-client",
  });
  return `${SESSION_COOKIE}=${token}`;
}


beforeEach(() => {
  vi.resetAllMocks();
  mocks.prismaMock.treatment.findFirst.mockResolvedValue(treatment);
  mocks.prismaMock.workingHours.findUnique.mockResolvedValue(workingHours);
  mocks.prismaMock.blockedDate.findUnique.mockResolvedValue(null);
  mocks.prismaMock.appointment.findMany.mockResolvedValue([]);
  mocks.prismaMock.appointment.updateMany.mockResolvedValue({ count: 0 });
  mocks.txAppointment.findFirst.mockResolvedValue(null);
  mocks.txAppointment.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "appointment-test-1",
    ...data,
    createdAt: new Date("2026-10-25T10:00:00.000Z"),
  }));  
  mocks.prismaMock.$transaction.mockImplementation(
    async (
      callback: (tx: {
        appointment: typeof mocks.txAppointment;
      }) => Promise<unknown>
    ) =>
      callback({
        appointment: mocks.txAppointment,
      })
  );
});

describe("GET /api/slots", () => {
  it("returns bookable slots for a valid clinic date and active treatment", async () => {
    const date = clinicDateInTwoDays();
    const response = await request(app).get("/api/slots").query({ date, treatmentId: treatment.id });

    expect(response.status).toBe(200);
    expect(response.body.date).toBe(date);
    expect(response.body.treatmentId).toBe(treatment.id);
    expect(response.body.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({ start: expect.any(String), end: expect.any(String), label: expect.any(String) }),
    ]));
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("rejects an invalid calendar date instead of silently rolling it over", async () => {
    const response = await request(app).get("/api/slots").query({ date: "2026-02-31", treatmentId: treatment.id });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("requires both date and treatmentId", async () => {
    const response = await request(app).get("/api/slots").query({ date: clinicDateInTwoDays() });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for an inactive or unknown treatment", async () => {
    mocks.prismaMock.treatment.findFirst.mockResolvedValue(null);
    const response = await request(app).get("/api/slots").query({ date: clinicDateInTwoDays(), treatmentId: "unknown" });
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });

  it("returns no slots on a closed day", async () => {
    mocks.prismaMock.workingHours.findUnique.mockResolvedValue({ ...workingHours, isOff: true });
    const response = await request(app).get("/api/slots").query({ date: clinicDateInTwoDays(), treatmentId: treatment.id });
    expect(response.status).toBe(200);
    expect(response.body.slots).toEqual([]);
  });

  it("does not return times blocked by a confirmed booking", async () => {
    const date = clinicDateInTwoDays();
    const busyStart = new Date(clinicTime(date, "10:00"));
    mocks.prismaMock.appointment.findMany.mockResolvedValue([
      { startTime: busyStart, endTime: new Date(busyStart.getTime() + 30 * 60_000) },
    ]);
    const response = await request(app).get("/api/slots").query({ date, treatmentId: treatment.id });
    expect(response.status).toBe(200);
    expect(response.body.slots.some((slot: { start: string }) => slot.start === busyStart.toISOString())).toBe(false);
  });
});

describe("POST /api/appointments", () => {
  it("requires an authenticated patient", async () => {
    const response = await request(app).post("/api/appointments").send({
      treatmentId: treatment.id,
      startTime: clinicTime(clinicDateInTwoDays(), "10:00"),
    });
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHENTICATED");
  });

  it("does not allow an OWNER session to create a patient booking", async () => {
    const response = await request(app)
      .post("/api/appointments")
      .set("Cookie", sessionCookie("OWNER", "owner-test-1"))
      .send({ treatmentId: treatment.id, startTime: clinicTime(clinicDateInTwoDays(), "10:00") });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  it("creates a PENDING appointment and a ten-minute hold without creating a payment", async () => {
    const date = clinicDateInTwoDays();
    const startTime = clinicTime(date, "10:00");
    const response = await request(app)
      .post("/api/appointments")
      .set("Cookie", sessionCookie())
      .send({ treatmentId: treatment.id, startTime, consultationType: "IN_CLINIC", isNewPatient: true });

    expect(response.status).toBe(201);
    expect(response.body.appointment).toMatchObject({
      id: "appointment-test-1",
      treatmentId: treatment.id,
      status: "PENDING",
      consultationType: "IN_CLINIC",
      isNewPatient: true,
    });
    expect(new Date(response.body.appointment.endTime).getTime() - new Date(response.body.appointment.startTime).getTime()).toBe(30 * 60_000);
    const createArgs = mocks.txAppointment.create.mock.calls[0]?.[0];
    expect(createArgs.data.patientId).toBe(testPatientId);
    expect(createArgs.data.status).toBe("PENDING");
    expect(new Date(createArgs.data.holdExpiresAt).getTime() - Date.now()).toBeGreaterThan(9 * 60_000);
    expect(new Date(createArgs.data.holdExpiresAt).getTime() - Date.now()).toBeLessThanOrEqual(10 * 60_000);
    expect(mocks.prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(response.body.payment).toBeUndefined();
  });

  it("rejects a duplicate slot when the transaction re-check sees a clash", async () => {
    mocks.txAppointment.findFirst.mockResolvedValue({ id: "appointment-already-holding-slot" });
    const response = await request(app)
      .post("/api/appointments")
      .set("Cookie", sessionCookie())
      .send({ treatmentId: treatment.id, startTime: clinicTime(clinicDateInTwoDays(), "10:00") });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SLOT_TAKEN");
    expect(mocks.txAppointment.create).not.toHaveBeenCalled();
  });

  it("rejects a slot that the public slots service no longer offers", async () => {
    const date = clinicDateInTwoDays();
    const start = new Date(clinicTime(date, "10:00"));
    mocks.prismaMock.appointment.findMany.mockResolvedValue([
      { startTime: start, endTime: new Date(start.getTime() + 30 * 60_000) },
    ]);
    const response = await request(app)
      .post("/api/appointments")
      .set("Cookie", sessionCookie())
      .send({ treatmentId: treatment.id, startTime: clinicTime(date, "10:00") });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SLOT_TAKEN");
    expect(mocks.txAppointment.create).not.toHaveBeenCalled();
  });

  it("rejects malformed or unknown booking fields", async () => {
    const response = await request(app)
      .post("/api/appointments")
      .set("Cookie", sessionCookie())
      .send({ treatmentId: treatment.id, startTime: "tomorrow morning", role: "OWNER" });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(mocks.txAppointment.create).not.toHaveBeenCalled();
  });

  it("rejects a request from an untrusted Origin", async () => {
    const response = await request(app)
      .post("/api/appointments")
      .set("Origin", "https://untrusted.example")
      .set("Cookie", sessionCookie())
      .send({ treatmentId: treatment.id, startTime: clinicTime(clinicDateInTwoDays(), "10:00") });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("BAD_ORIGIN");
  });
});

describe("releaseExpiredHolds", () => {
  it("cancels only pending holds that have expired", async () => {
    mocks.prismaMock.appointment.updateMany.mockResolvedValue({ count: 3 });
    const now = new Date("2026-10-25T10:00:00.000Z");
    const count = await releaseExpiredHolds(now);
    expect(count).toBe(3);
    expect(mocks.prismaMock.appointment.updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING", holdExpiresAt: { lte: now } },
      data: { status: "CANCELLED" },
    });
  });
});
