import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatePicker } from "./DatePicker";

afterEach(cleanup);

const props = { value: "", minDate: "2026-11-03", maxDate: "2026-12-20", closedWeekdays: [0] };

describe("DatePicker", () => {
  it("disables past days and closed weekdays, and selects an open day", () => {
    const onChange = vi.fn();
    render(<DatePicker {...props} onChange={onChange} />);

    expect((screen.getByRole("button", { name: "Monday, 2 November 2026" }) as HTMLButtonElement).disabled).toBe(true); // before the first bookable day
    expect((screen.getByRole("button", { name: "Sunday, 8 November 2026 (closed)" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Wednesday, 4 November 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-04");
  });

  it("marks the selected day and limits month navigation to the bookable range", () => {
    render(<DatePicker {...props} value="2026-11-04" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Wednesday, 4 November 2026" }).getAttribute("aria-pressed")).toBe("true");

    expect((screen.getByRole("button", { name: "Previous month" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("December 2026")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Next month" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Monday, 21 December 2026" }) as HTMLButtonElement).disabled).toBe(true); // after the last day
  });
});
