import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarView } from "../../components/owner/CalendarView";
import { ScheduleList } from "../../components/owner/ScheduleList";
import { EmptyHint, ListBoundary } from "../../components/patient/ListBoundary";
import { Button } from "../../components/ui/Button";
import { useOwnerCalendar, useOwnerDay } from "../../hooks/useOwnerData";
import { useNowOnce } from "../../hooks/useNowOnce";
import { addDays, formatLongDate, isValidIsoDate, isoFromParts, monthOf, todayInClinic } from "../../lib/dates";
import { inputClass } from "../../lib/formStyles";
import type { ScheduleFilters } from "../../api/owner.api";

const STATUSES = ["", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
const PAYMENTS = ["", "PAID", "PENDING", "FAILED", "REFUND_PENDING", "REFUND_FAILED", "REFUNDED"] as const;

/**
 * Schedule with a day list or a month calendar, plus filters (status, payment, visit type, patient search).
 * Everything lives in the URL (?date=…&view=month&status=CONFIRMED&q=priya) so a view can be bookmarked or shared.
 */
export function OwnerAppointmentsPage() {
  const [params, setParams] = useSearchParams();
  const [today] = useState(() => todayInClinic());
  const now = useNowOnce();

  const requested = params.get("date") ?? "";
  const date = isValidIsoDate(requested) ? requested : today;
  const view = params.get("view") === "month" ? "month" : "day";
  const filters: ScheduleFilters = {
    status: (STATUSES as readonly string[]).includes(params.get("status") ?? "") ? (params.get("status") as ScheduleFilters["status"]) : "",
    paymentStatus: (PAYMENTS as readonly string[]).includes(params.get("payment") ?? "") ? (params.get("payment") ?? "") : "",
    consultationType: params.get("type") === "VIDEO" ? "VIDEO" : params.get("type") === "IN_CLINIC" ? "IN_CLINIC" : "",
    q: params.get("q") ?? "",
  };

  const { year, month } = monthOf(date);
  const from = isoFromParts(year, month, 1);
  const to = isoFromParts(year, month, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());

  const day = useOwnerDay(date, filters);
  const calendar = useOwnerCalendar(view === "month" ? from : "", to, filters);

  const patch = (next: Record<string, string>) => {
  const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) {
        merged.set(k, v);
      } else {
        merged.delete(k);
      }
    }
    setParams(merged, { replace: true });
  };
  const go = (iso: string) => patch({ date: iso });
  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    go(isoFromParts(d.getUTCFullYear(), d.getUTCMonth(), 1));
  };
  const iconBtn = "grid h-10 w-10 place-items-center";
  const select = `${inputClass} !w-auto`;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
          <p className="mt-1 text-slate-600" aria-live="polite">
            {formatLongDate(date)}
            {date === today && " (today)"}
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="View">
          <Button variant={view === "day" ? undefined : "outline"} aria-pressed={view === "day"} onClick={() => patch({ view: "" })}>
            <List className="h-4 w-4" aria-hidden="true" /> Day
          </Button>
          <Button variant={view === "month" ? undefined : "outline"} aria-pressed={view === "month"} onClick={() => patch({ view: "month" })}>
            <CalendarDays className="h-4 w-4" aria-hidden="true" /> Month
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className={iconBtn} onClick={() => go(addDays(date, -1))} aria-label="Previous day">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <label htmlFor="schedule-date" className="sr-only">Choose a date</label>
        <input id="schedule-date" type="date" value={date} onChange={(e) => isValidIsoDate(e.target.value) && go(e.target.value)} className={select} />
        <Button variant="outline" className={iconBtn} onClick={() => go(addDays(date, 1))} aria-label="Next day">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Button>
        {date !== today && <Button variant="ghost" onClick={() => go(today)}>Today</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filter appointments">
        <label htmlFor="f-q" className="sr-only">Search patient</label>
        <input id="f-q" className={`${inputClass} !w-56`} placeholder="Search name, email, phone" defaultValue={filters.q} onChange={(e) => patch({ q: e.target.value })} />
        <label htmlFor="f-status" className="sr-only">Status</label>
        <select id="f-status" className={select} value={filters.status} onChange={(e) => patch({ status: e.target.value })}>
          {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace("_", " ").toLowerCase() : "Any status"}</option>)}
        </select>
        <label htmlFor="f-payment" className="sr-only">Payment</label>
        <select id="f-payment" className={select} value={filters.paymentStatus} onChange={(e) => patch({ payment: e.target.value })}>
          {PAYMENTS.map((s) => <option key={s} value={s}>{s ? `payment: ${s.replace("_", " ").toLowerCase()}` : "Any payment"}</option>)}
        </select>
        <label htmlFor="f-type" className="sr-only">Visit type</label>
        <select id="f-type" className={select} value={filters.consultationType} onChange={(e) => patch({ type: e.target.value })}>
          <option value="">Any visit type</option>
          <option value="IN_CLINIC">In clinic</option>
          <option value="VIDEO">Video</option>
        </select>
        {(filters.q || filters.status || filters.paymentStatus || filters.consultationType) && (
          <Button variant="ghost" onClick={() => patch({ q: "", status: "", payment: "", type: "" })}>Clear filters</Button>
        )}
      </div>

      {view === "month" && (
        <>
          <CalendarView year={year} month={month} days={calendar.data?.days ?? {}} selected={date} onSelect={go} onMonthChange={shiftMonth} />
          {calendar.data?.truncated && <p className="text-sm text-amber-800">Showing the first 1,000 matches. Narrow the filters to see everything.</p>}
          {calendar.isError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">Couldn&apos;t load the calendar. Please try again.</p>}
        </>
      )}

      <ListBoundary query={day} skeletons={3} empty={<EmptyHint>No appointments on this day{filters.q || filters.status ? " for these filters" : ""}.</EmptyHint>}>
        {(items) => (
          <>
            <p className="text-sm text-slate-500">{items.length} appointment{items.length === 1 ? "" : "s"}</p>
            <ScheduleList appointments={items} now={now} />
          </>
        )}
      </ListBoundary>
    </>
  );
}
