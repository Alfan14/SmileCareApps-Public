import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Environment is initialised before config/env.ts is imported by the app.
vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "test-session-secret-must-be-at-least-32-chars";
});

const prismaMock = vi.hoisted(() => ({
  treatment: { findMany: vi.fn(), findFirst: vi.fn() },
  faq: { findMany: vi.fn() },
  review: { findMany: vi.fn() },
  contactMessage: { create: vi.fn() },
}));

vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));

import { app } from "../../src/app";

const treatment = {
  id: "t1",
  name: "Teeth Cleaning",
  slug: "teeth-cleaning",
  description: "Removes plaque",
  durationMin: 45,
  priceMin: 150000,
  priceMax: 300000,
  bookingPrice: 150000,
  imageUrl: null,
  sortOrder: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("health and routing", () => {
  it("GET /api/health returns the health status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("returns a JSON 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/no-such-route");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/treatments", () => {
  it("lists active treatments only", async () => {
    prismaMock.treatment.findMany.mockResolvedValue([treatment]);
    const res = await request(app).get("/api/treatments");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(prismaMock.treatment.findMany.mock.calls[0]?.[0].where).toEqual({ active: true });
  });

  it("returns one active treatment by slug or id", async () => {
    prismaMock.treatment.findFirst.mockResolvedValue(treatment);
    const res = await request(app).get("/api/treatments/teeth-cleaning");
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("teeth-cleaning");
  });

  it("returns 404 when the treatment does not exist or is inactive", async () => {
    prismaMock.treatment.findFirst.mockResolvedValue(null);
    const res = await request(app).get("/api/treatments/unknown-treatment");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/faqs", () => {
  it("lists FAQs and applies the category filter", async () => {
    prismaMock.faq.findMany.mockResolvedValue([
      { id: "f1", question: "Q?", answer: "A.", category: "general", sortOrder: 0 },
    ]);
    const res = await request(app).get("/api/faqs?category=general");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(prismaMock.faq.findMany.mock.calls[0]?.[0].where).toEqual({ category: "general" });
  });

  it("lists all categories when no category is provided", async () => {
    prismaMock.faq.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/faqs");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(prismaMock.faq.findMany.mock.calls[0]?.[0].where).toEqual({});
  });
});

describe("GET /api/reviews", () => {
  it("returns approved reviews only, applies the default limit, and omits patient ids", async () => {
    prismaMock.review.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/reviews");
    expect(res.status).toBe(200);
    const args = prismaMock.review.findMany.mock.calls[0]?.[0];
    expect(args.where).toEqual({ approved: true });
    expect(args.take).toBe(12);
    expect(args.select.patientId).toBeUndefined();
  });

  it("accepts a valid custom limit", async () => {
    prismaMock.review.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/reviews?limit=5");
    expect(res.status).toBe(200);
    expect(prismaMock.review.findMany.mock.calls[0]?.[0].take).toBe(5);
  });

  it.each(["0", "51", "abc"]) ("rejects invalid limit %s", async (limit) => {
    const res = await request(app).get(`/api/reviews?limit=${limit}`);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(prismaMock.review.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/contact", () => {
  const valid = {
    name: "Priya Sharma",
    email: "priya@example.com",
    message: "I would like to ask about whitening.",
  };

  it("stores a valid contact message", async () => {
    prismaMock.contactMessage.create.mockResolvedValue({});
    const res = await request(app).post("/api/contact").send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(prismaMock.contactMessage.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.contactMessage.create.mock.calls[0]?.[0].data).toMatchObject({
      name: "Priya Sharma",
      body: valid.message,
      phone: null,
    });
  });

  it("rejects an invalid email", async () => {
    const res = await request(app).post("/api/contact").send({ ...valid, email: "not-an-email" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(prismaMock.contactMessage.create).not.toHaveBeenCalled();
  });

  it("rejects a message shorter than 10 characters", async () => {
    const res = await request(app).post("/api/contact").send({ ...valid, message: "Too short" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(prismaMock.contactMessage.create).not.toHaveBeenCalled();
  });

  it("rejects unknown fields", async () => {
    const res = await request(app).post("/api/contact").send({ ...valid, role: "OWNER" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(prismaMock.contactMessage.create).not.toHaveBeenCalled();
  });

  it("silently ignores honeypot submissions", async () => {
    const res = await request(app).post("/api/contact").send({ ...valid, website: "https://spam.example" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(prismaMock.contactMessage.create).not.toHaveBeenCalled();
  });
});
