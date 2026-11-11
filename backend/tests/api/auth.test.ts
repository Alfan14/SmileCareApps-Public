import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "test-session-secret-must-be-at-least-32-chars";
  process.env.CLIENT_URL = "http://localhost:5173";
});

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));

import { app } from "../../src/app";
import { authenticate, requireRole, SESSION_COOKIE } from "../../src/middleware/auth.middleware";
import { errorHandler } from "../../src/middleware/errors";

const secret = "test-session-secret-must-be-at-least-32-chars";
const baseUser = {
  id: "user-patient-1",
  name: "Priya Sharma",
  email: "priya@example.test",
  phone: null,
  role: "PATIENT" as const,
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
};

function makeAuthzTestApp() {
  const testApp = express();
  testApp.use(cookieParser());
  testApp.get("/owner-only", authenticate, requireRole("OWNER"), (_req, res) => {
    res.status(200).json({ ok: true });
  });
  testApp.use(errorHandler);
  return testApp;
}

function tokenFor(role: "PATIENT" | "OWNER", subject = "test-user") {
  return jwt.sign({ role }, secret, {
    subject,
    expiresIn: "1h",
    issuer: "smilecare-api",
    audience: "smilecare-client",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/auth/register", () => {
  it("creates a PATIENT, hashes the password, and sets an HttpOnly session cookie", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(baseUser);

    const res = await request(app).post("/api/auth/register").send({
      name: "Priya Sharma",
      email: "PRIYA@EXAMPLE.TEST",
      password: "Password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ id: baseUser.id, role: "PATIENT", email: "priya@example.test" });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(prismaMock.user.create).toHaveBeenCalledOnce();

    const createArgs = prismaMock.user.create.mock.calls[0]?.[0];
    expect(createArgs.data.role).toBe("PATIENT");
    expect(createArgs.data.email).toBe("priya@example.test");
    expect(createArgs.data.passwordHash).not.toBe("Password123");
    expect(await bcrypt.compare("Password123", createArgs.data.passwordHash)).toBe(true);

    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies[0]).toContain(`${SESSION_COOKIE}=`);
    expect(cookies[0]).toMatch(/HttpOnly/i);
    expect(cookies[0]).toMatch(/SameSite=Lax/i);
  });

  it("rejects a duplicate email", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: baseUser.id });
    const res = await request(app).post("/api/auth/register").send({
      name: "Priya Sharma",
      email: "priya@example.test",
      password: "Password123",
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EMAIL_EXISTS");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects weak passwords and unknown fields, including a client-supplied role", async () => {
    const weakPassword = await request(app).post("/api/auth/register").send({
      name: "Priya Sharma",
      email: "priya@example.test",
      password: "password",
    });
    expect(weakPassword.status).toBe(422);
    expect(weakPassword.body.code).toBe("VALIDATION_ERROR");

    const forgedRole = await request(app).post("/api/auth/register").send({
      name: "Priya Sharma",
      email: "priya@example.test",
      password: "Password123",
      role: "OWNER",
    });
    expect(forgedRole.status).toBe(422);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/login", () => {
  it("accepts valid credentials and establishes a session", async () => {
    const passwordHash = await bcrypt.hash("Password123", 4);
    prismaMock.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });

    const res = await request(app).post("/api/auth/login").send({
      email: "PRIYA@EXAMPLE.TEST",
      password: "Password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: baseUser.id, role: "PATIENT" });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(prismaMock.user.findUnique.mock.calls[0]?.[0].where.email).toBe("priya@example.test");
    expect((res.headers["set-cookie"] as string[])[0]).toMatch(/HttpOnly/i);
  });

  it("returns a generic 401 for an unknown account", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await request(app).post("/api/auth/login").send({
      email: "missing@example.test",
      password: "Password123",
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns the same generic 401 for a wrong password", async () => {
    const passwordHash = await bcrypt.hash("Password123", 4);
    prismaMock.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
    const res = await request(app).post("/api/auth/login").send({
      email: "priya@example.test",
      password: "WrongPassword123",
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects a request from an untrusted Origin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://untrusted.example")
      .send({ email: "priya@example.test", password: "Password123" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("BAD_ORIGIN");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/me and POST /api/auth/logout", () => {
  it("rejects /me without a session cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("returns the current public user for a valid session", async () => {
    const passwordHash = await bcrypt.hash("Password123", 4);
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ ...baseUser, passwordHash })
      .mockResolvedValueOnce(baseUser);

    const login = await request(app).post("/api/auth/login").send({
      email: "priya@example.test",
      password: "Password123",
    });
    const cookie = ((login.headers["set-cookie"] as string[])[0] ?? "").split(";")[0];
    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);

    expect(login.status).toBe(200);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ id: baseUser.id, email: baseUser.email, role: "PATIENT" });
    expect(me.body.user.passwordHash).toBeUndefined();
  });

  it("clears the session cookie on logout", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies[0]).toContain(`${SESSION_COOKIE}=`);
    expect(cookies[0]).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);
  });

  it("returns 401 if the user belonging to a valid token no longer exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const cookie = `${SESSION_COOKIE}=${tokenFor("PATIENT", baseUser.id)}`;
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });
});

describe("authenticate and requireRole middleware", () => {
  const authzApp = makeAuthzTestApp();

  it("rejects requests without a token", async () => {
    const res = await request(authzApp).get("/owner-only");
    expect(res.status).toBe(401);
  });

  it("blocks a PATIENT from an OWNER-only route", async () => {
    const res = await request(authzApp)
      .get("/owner-only")
      .set("Cookie", `${SESSION_COOKIE}=${tokenFor("PATIENT")}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("allows an OWNER into an OWNER-only route", async () => {
    const res = await request(authzApp)
      .get("/owner-only")
      .set("Cookie", `${SESSION_COOKIE}=${tokenFor("OWNER")}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("rejects malformed and expired tokens", async () => {
    const malformed = await request(authzApp).get("/owner-only").set("Cookie", `${SESSION_COOKIE}=bad-token`);
    expect(malformed.status).toBe(401);

    const expiredToken = jwt.sign({ role: "OWNER" }, secret, {
      subject: "expired-owner",
      expiresIn: -10,
      issuer: "smilecare-api",
      audience: "smilecare-client",
    });
    const expired = await request(authzApp)
      .get("/owner-only")
      .set("Cookie", `${SESSION_COOKIE}=${expiredToken}`);
    expect(expired.status).toBe(401);
  });
});
