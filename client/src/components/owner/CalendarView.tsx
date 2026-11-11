import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatMonthYear, formatSlotTime, monthGrid, todayInClinic } from "../../lib/dates";
import type { OwnerAppointment } from "../../types/api";
import { Button } from "../ui/Button";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dot: Record<string, string> = {
  CONFIRMED: "bg-emerald-500", PENDING: "bg-amber-400", COMPLETED: "bg-brand-strong", CANCELLED: "bg-slate-300", NO_SHOW: "bg-red-500",
};

type Props = {
  year: number;
  month: number; // 0-11
  days: Record<string, OwnerAppointment[]>;
  selected: string;
  onSelect: (iso: string) => void;
  onMonthChange: (delta: number) => void;
};

/** Month grid. Each day shows up to three appointments; click a day to open it in the day list. */
export function CalendarView({ year, month, days, selected, onSelect, onMonthChange }: Props) {
  const cells = monthGrid(year, month);
  const today = todayInClinic();

  return (
    <section aria-label="Month calendar" className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" className="grid h-9 w-9 place-items-center" onClick={() => onMonthChange(-1)} aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <h2 className="font-semibold text-brand-deep" aria-live="polite">{formatMonthYear(year, month)}</h2>
        <Button variant="outline" className="grid h-9 w-9 place-items-center" onClick={() => onMonthChange(1)} aria-label="Next month">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="grid min-w-[42rem] grid-cols-7 gap-1 text-xs">
          {WEEKDAYS.map((d) => <div key={d} className="py-1 text-center font-semibold text-slate-500">{d}</div>)}
          {cells.map((iso, i) => {
            if (!iso) return <div key={`blank-${i}`} />;
            const items = (days[iso] ?? []).filter((a) => a.status !== "CANCELLED");
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelect(iso)}
                aria-label={`${iso}, ${items.length} appointment${items.length === 1 ? "" : "s"}`}
                aria-pressed={selected === iso}
                className={cn(
                  "min-h-24 rounded-xl border p-1.5 text-left align-top hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand-deep",
                  selected === iso ? "border-brand-strong bg-brand-soft" : "border-slate-100",
                  iso === today && "ring-1 ring-brand-strong",
                )}
              >
                <span className="block text-sm font-semibold text-slate-700">{Number(iso.slice(8, 10))}</span>
                {items.slice(0, 3).map((a) => (
                  <span key={a.id} className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-600">
                    <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot[a.status] ?? "bg-slate-300")} />
                    {formatSlotTime(a.startTime)} {a.patientName}
                  </span>
                ))}
                {items.length > 3 && <span className="mt-0.5 block text-[11px] font-semibold text-brand-deep">+{items.length - 3} more</span>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
