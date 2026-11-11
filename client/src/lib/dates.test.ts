import { describe, expect, it } from "vitest";
import { addDays, clinicDateOf, formatLongDate, formatSlotTime, isValidIsoDate, monthGrid, monthOf, todayInClinic, weekdayOf } from "./dates";

describe("dates", () => {
  it("validates real calendar dates only", () => {
    expect(isValidIsoDate("2026-11-03")).toBe(true);
    expect(isValidIsoDate("2026-02-31")).toBe(false);
    expect(isValidIsoDate("03-11-2026")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("finds the weekday", () => {
    expect(weekdayOf("2026-11-01")).toBe(0); // Sunday
    expect(weekdayOf("2026-11-02")).toBe(1); // Monday
  });

  it("builds a month grid that starts on a Sunday column", () => {
    const grid = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(grid[0]).toBe("2026-11-01");
    expect(grid).toHaveLength(30);
    const oct = monthGrid(2026, 9); // October 2026 starts on a Thursday: 4 blanks first
    expect(oct.slice(0, 5)).toEqual([null, null, null, null, "2026-10-01"]);
    expect(monthOf("2026-11-17")).toEqual({ year: 2026, month: 10 });
  });

  it("formats dates and slot times in clinic time", () => {
    expect(formatLongDate("2026-11-03")).toContain("3 November 2026");
    // 05:00 UTC is 10:30 in India
    expect(formatSlotTime("2026-11-03T05:00:00.000Z")).toMatch(/^10:30/);
    expect(clinicDateOf("2026-11-03T20:00:00.000Z")).toBe("2026-11-04"); // 01:30 IST next day
  });

  it("returns today's date in clinic time", () => {
    expect(todayInClinic()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
