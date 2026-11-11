import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatLongDate, formatMonthYear, monthGrid, monthOf, weekdayOf } from "../../lib/dates";

type Props = {
  value: string; // "YYYY-MM-DD" or ""
  minDate: string;
  maxDate: string;
  closedWeekdays: readonly number[];
  onChange: (iso: string) => void;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DatePicker({ value, minDate, maxDate, closedWeekdays, onChange }: Props) {
  const [view, setView] = useState(() => monthOf(value || minDate));
  const first = monthOf(minDate);
  const last = monthOf(maxDate);

  const atFirst = view.year === first.year && view.month === first.month;
  const atLast = view.year === last.year && view.month === last.month;

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(Date.UTC(v.year, v.month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }

  const navButton =
    "grid h-9 w-9 place-items-center rounded-full text-brand-deep hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand-deep";

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <button type="button" className={navButton} onClick={() => shift(-1)} disabled={atFirst} aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="font-semibold text-brand-deep" aria-live="polite">
          {formatMonthYear(view.year, view.month)}
        </p>
        <button type="button" className={navButton} onClick={() => shift(1)} disabled={atLast} aria-label="Next month">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthGrid(view.year, view.month).map((iso, i) => {
          if (!iso) return <span key={`blank-${i}`} />;
          const closed = closedWeekdays.includes(weekdayOf(iso));
          const disabled = iso < minDate || iso > maxDate || closed;
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${formatLongDate(iso)}${closed ? " (closed)" : ""}`}
              onClick={() => onChange(iso)}
              className={cn(
                "grid aspect-square place-items-center rounded-full text-sm focus-visible:outline-2 focus-visible:outline-brand-deep",
                selected && "bg-brand-strong font-bold text-white",
                !selected && !disabled && "text-slate-700 hover:bg-brand-soft",
                disabled && "cursor-not-allowed text-slate-300",
              )}
            >
              {Number(iso.slice(8, 10))}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">Greyed-out days are in the past, too far ahead, or the clinic is closed.</p>
    </div>
  );
}
