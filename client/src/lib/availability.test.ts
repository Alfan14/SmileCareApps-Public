import { describe, expect, it } from "vitest";
import { availabilityFrom } from "./normalizeOwner";
import { availabilitySchema, toForm, toPayload } from "./availability";

const base = () => toForm(availabilityFrom({}));
const messages = (form: ReturnType<typeof base>) => {
  const r = availabilitySchema.safeParse(form);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("availabilitySchema", () => {
  it("accepts the default week", () => {
    expect(messages(base())).toEqual([]);
  });

  it("rejects closing before opening", () => {
    const f = base();
    f.hours[0] = { ...f.hours[0]!, startTime: "18:00", endTime: "09:00" };
    expect(messages(f)).toContain("hours.0.endTime: Closing time must be after opening time");
  });

  it("needs both break times or neither, and the break inside opening hours", () => {
    const f = base();
    f.hours[1] = { ...f.hours[1]!, breakEnd: "" };
    f.hours[2] = { ...f.hours[2]!, breakStart: "08:00", breakEnd: "08:30" };
    f.hours[3] = { ...f.hours[3]!, breakStart: "", breakEnd: "" };
    const m = messages(f);
    expect(m).toContain("hours.1.breakEnd: Set both break times, or clear both");
    expect(m).toContain("hours.2.breakStart: The break must be inside opening hours");
    expect(m.some((x) => x.startsWith("hours.3"))).toBe(false);
  });

  it("ignores the times of a closed day", () => {
    const f = base();
    f.hours[6] = { ...f.hours[6]!, isOff: true, startTime: "nonsense", endTime: "" };
    expect(messages(f)).toEqual([]);
  });

  it("limits slot length and flags duplicate blocked dates", () => {
    const f = base();
    f.hours[0] = { ...f.hours[0]!, slotMinutes: 5 };
    f.blocked = [{ date: "2026-12-25", reason: "" }, { date: "2026-12-25", reason: "again" }];
    const m = messages(f);
    expect(m).toContain("hours.0.slotMinutes: At least 10 minutes");
    expect(m).toContain("blocked.1.date: This date is already blocked");
  });
});

describe("toForm / toPayload", () => {
  it("round-trips, turning empty breaks into null and sorting blocked dates", () => {
    const f = base();
    f.hours[3] = { ...f.hours[3]!, breakStart: "", breakEnd: "" };
    f.blocked = [{ date: "2026-12-25", reason: " Holiday " }, { date: "2026-11-01", reason: "" }];
    const payload = toPayload(f);
    expect(payload.workingHours[3]).toMatchObject({ breakStart: null, breakEnd: null });
    expect(payload.workingHours[0]).toMatchObject({ breakStart: "13:00", breakEnd: "14:00" });
    expect(payload.blockedDates).toEqual([{ date: "2026-11-01", reason: "" }, { date: "2026-12-25", reason: "Holiday" }]);
  });
});
