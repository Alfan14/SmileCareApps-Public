import { describe, expect, it } from "vitest";
import {
  blockedDatesQuerySchema,
  ownerScheduleQuerySchema,
  workingHoursBodySchema,
} from "../../src/validators/owner-dashboard.schema";

describe("owner dashboard date validation", () => {
  it("accepts a real leap-day date", () => {
    expect(ownerScheduleQuerySchema.safeParse({ from: "2024-02-29", to: "2024-03-01" }).success).toBe(true);
  });

  it("rejects impossible calendar dates", () => {
    expect(ownerScheduleQuerySchema.safeParse({ from: "2025-02-29" }).success).toBe(false);
    expect(blockedDatesQuerySchema.safeParse({ from: "2026-04-31" }).success).toBe(false);
  });

  it("rejects a reversed schedule date range", () => {
    expect(ownerScheduleQuerySchema.safeParse({ from: "2026-10-31", to: "2026-10-30" }).success).toBe(false);
  });

  it("rejects schedule ranges longer than 91 calendar days", () => {
    expect(ownerScheduleQuerySchema.safeParse({ from: "2026-01-01", to: "2026-04-02" }).success).toBe(false);
  });

  it("accepts a schedule range of exactly 91 calendar days", () => {
    expect(ownerScheduleQuerySchema.safeParse({ from: "2026-01-01", to: "2026-04-01" }).success).toBe(true);
  });

  it("rejects blocked-date ranges longer than 366 calendar days", () => {
    expect(blockedDatesQuerySchema.safeParse({ from: "2025-01-01", to: "2026-01-02" }).success).toBe(false);
  });

  it("rejects invalid working-hour intervals", () => {
    expect(workingHoursBodySchema.safeParse({
      startTime: "18:00", endTime: "09:00", isOff: false,
    }).success).toBe(false);
  });
});
