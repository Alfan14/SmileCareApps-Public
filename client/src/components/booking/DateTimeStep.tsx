import { CLOSED_WEEKDAYS, LAST_BOOKABLE_DATE, TODAY } from "../../lib/booking";
import { cn } from "../../lib/cn";
import { formatLongDate, formatSlotTime } from "../../lib/dates";
import { useSlots } from "../../hooks/useBooking";
import type { Treatment } from "../../types/api";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/StateMessage";
import { DatePicker } from "./DatePicker";

type Props = {
  treatment: Treatment | undefined;
  date: string;
  slotStart: string | null;
  onDateChange: (iso: string) => void;
  onSlotChange: (startIso: string) => void;
};

function Hint({ children }: { children: string }) {
  return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{children}</p>;
}

function Times({ treatment, date, slotStart, onSlotChange }: Omit<Props, "onDateChange"> & { treatment: Treatment }) {
  const { data, isPending, isError, isFetching, refetch } = useSlots(date, treatment.id);

  if (isPending) {
    return (
      <div className="grid grid-cols-3 gap-2" aria-busy="true">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-10 rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState message="We could not load the available times." onRetry={() => void refetch()} />;
  if (data.length === 0) return <Hint>No times are available on this day. Please choose another date.</Hint>;

  return (
    <div role="group" aria-label={`Available times on ${formatLongDate(date)}`} className={cn("grid grid-cols-3 gap-2", isFetching && "opacity-70")}>
      {data.map((s) => {
        const selected = s.start === slotStart;
        return (
          <button
            key={s.start}
            type="button"
            aria-pressed={selected}
            onClick={() => onSlotChange(s.start)}
            className={cn(
              "rounded-xl border px-2 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep",
              selected ? "border-brand-strong bg-brand-strong text-white" : "border-slate-200 text-slate-700 hover:border-brand hover:bg-brand-soft",
            )}
          >
            {formatSlotTime(s.start)}
          </button>
        );
      })}
    </div>
  );
}

export function DateTimeStep({ treatment, date, slotStart, onDateChange, onSlotChange }: Props) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <DatePicker value={date} minDate={TODAY} maxDate={LAST_BOOKABLE_DATE} closedWeekdays={CLOSED_WEEKDAYS} onChange={onDateChange} />
      <div>
        <h3 className="mb-3 text-sm font-semibold text-brand-deep">
          {date ? `Times on ${formatLongDate(date)}` : "Available times"} <span className="font-normal text-slate-500">(India time)</span>
        </h3>
        {!treatment ? (
          <Hint>Choose a treatment first, so we can show times that fit its length.</Hint>
        ) : !date ? (
          <Hint>Pick a date to see the available times.</Hint>
        ) : (
          <Times treatment={treatment} date={date} slotStart={slotStart} onSlotChange={onSlotChange} />
        )}
      </div>
    </div>
  );
}
