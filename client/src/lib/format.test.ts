import { describe, expect, it } from "vitest";
import { formatDuration, formatPaise, formatPriceRange, todayLocalIso } from "./format";

describe("format", () => {
  it("formats paise as rupees", () => {
    expect(formatPaise(50000)).toBe("₹500");
    expect(formatPaise(150000)).toBe("₹1,500");
    expect(formatPaise(4000000)).toBe("₹40,000");
  });

  it("formats price ranges", () => {
    expect(formatPriceRange(150000, 300000)).toBe("₹1,500 – ₹3,000");
    expect(formatPriceRange(50000, 50000)).toBe("₹500");
  });

  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(90)).toBe("1 hr 30 min");
  });

  it("returns an ISO date for today", () => {
    expect(todayLocalIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
