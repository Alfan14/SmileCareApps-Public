import { describe, expect, it } from "vitest";
import { compactRupees, shortDay, shortMonth } from "./chartFormat";

describe("chartFormat", () => {
  it("formats days and months", () => {
    expect(shortDay("2026-11-03")).toBe("3 Nov");
    expect(shortMonth("2026-10")).toBe("Oct 2026");
  });

  it("shortens rupee amounts the Indian way (K, lakh, crore)", () => {
    expect(compactRupees(0)).toBe("₹0");
    expect(compactRupees(50_000)).toBe("₹500");
    expect(compactRupees(1_245_000)).toBe("₹12.5K"); // 12,450 rupees
    expect(compactRupees(12_450_000)).toBe("₹1.2L"); // 1,24,500 rupees
  });
});
