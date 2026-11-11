import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

const event = {
  uid: "apt_1",
  title: "Teeth Cleaning, SmileCare Clinic",
  start: "2026-11-03T04:30:00.000Z",
  end: "2026-11-03T05:15:00.000Z",
  location: "123 Smile Street; Indiranagar",
  description: "Line one\nLine two",
  stamp: "2026-11-01T10:00:00.000Z",
};

describe("buildIcs", () => {
  const ics = buildIcs(event);

  it("is a valid calendar with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("writes UTC times", () => {
    expect(ics).toContain("DTSTART:20261103T043000Z");
    expect(ics).toContain("DTEND:20261103T051500Z");
    expect(ics).toContain("DTSTAMP:20261101T100000Z");
  });

  it("escapes commas, semicolons and new lines", () => {
    expect(ics).toContain("SUMMARY:Teeth Cleaning\\, SmileCare Clinic");
    expect(ics).toContain("LOCATION:123 Smile Street\\; Indiranagar");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two");
  });

  it("folds long lines to at most 75 characters", () => {
    const long = buildIcs({ ...event, description: "x".repeat(200) });
    for (const line of long.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
  });
});
