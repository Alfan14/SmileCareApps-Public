import { useQuery } from "@tanstack/react-query";
import { CalendarClock, XCircle } from "lucide-react";
import { useState } from "react";
import { getSlots } from "../../api/booking.api";
import type { ApiError } from "../../api/client";
import { useCancelAppointment, useRescheduleAppointment } from "../../hooks/useAppointmentActions";
import { addDays, formatShortDate, todayInClinic } from "../../lib/dates";
import { inputClass } from "../../lib/formStyles";
import { clinic, telHref } from "../../lib/clinic";
import type { MyAppointment } from "../../types/api";
import { Button } from "../ui/Button";

const CUTOFF_HOURS = 24; // keep in sync with CANCEL_CUTOFF_HOURS on the server
const MAX_RESCHEDULES = 2; // keep in sync with MAX_RESCHEDULES on the server

const messageFor = (err: unknown) => {
  const e = err as ApiError;
  if (e.code === "TOO_LATE") return `${e.message}`;
  return e.message || "Something went wrong. Please try again.";
};

/** Cancel / reschedule for an upcoming CONFIRMED appointment (or cancel for an unpaid hold). */
export function ManageAppointment({ appointment: a, now }: { appointment: MyAppointment; now: number }) {
  const [mode, setMode] = useState<"idle" | "cancel" | "reschedule">("idle");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(() => addDays(todayInClinic(), 1));
  const [picked, setPicked] = useState("");
  const cancel = useCancelAppointment();
  const reschedule = useRescheduleAppointment();

  const hoursLeft = (Date.parse(a.startTime) - now) / 3_600_000;
  const insideCutoff = a.status === "CONFIRMED" && hoursLeft < CUTOFF_HOURS;
  const canReschedule = a.status === "CONFIRMED" && !insideCutoff && (a.rescheduleCount ?? 0) < MAX_RESCHEDULES && !!a.treatmentId;

  const slots = useQuery({
    queryKey: ["slots", date, a.treatmentId],
    queryFn: () => getSlots(date, a.treatmentId ?? ""),
    enabled: mode === "reschedule" && !!a.treatmentId,
  });

  if (insideCutoff) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        This visit is less than {CUTOFF_HOURS} hours away, so it can&apos;t be changed online. Please{" "}
        <a href={telHref} className="font-semibold underline">call the clinic</a> ({clinic.phone}).
      </p>
    );
  }

  if (cancel.isSuccess) {
    const refunded = cancel.data.refundStatus;
    return (
      <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
        Appointment cancelled.
        {refunded === "REFUND_FAILED"
          ? " We couldn't start your refund automatically; the clinic has been alerted and will contact you."
          : refunded
            ? " Your booking fee is being refunded and should reach your card in 5–10 business days."
            : ""}
      </p>
    );
  }
  if (reschedule.isSuccess) {
    return <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Your appointment has been moved. A confirmation email is on its way.</p>;
  }

  return (
    <div className="mt-3">
      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          {canReschedule && (
            <Button variant="outline" onClick={() => setMode("reschedule")}>
              <CalendarClock className="h-4 w-4" aria-hidden="true" /> Reschedule
            </Button>
          )}
          <Button variant="ghost" onClick={() => setMode("cancel")}>
            <XCircle className="h-4 w-4" aria-hidden="true" /> Cancel appointment
          </Button>
        </div>
      )}

      {mode === "cancel" && (
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-800">Cancel this appointment?</p>
          <p className="mt-1 text-xs text-slate-500">
            {a.status === "CONFIRMED" ? "Your booking fee will be refunded to your original payment method." : "Your held time will be released."}
          </p>
          <label htmlFor={`reason-${a.id}`} className="sr-only">Reason (optional)</label>
          <input id={`reason-${a.id}`} className={`${inputClass} mt-2`} placeholder="Reason (optional)" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <Button onClick={() => cancel.mutate({ id: a.id, reason: reason.trim() || undefined })} disabled={cancel.isPending}>
              {cancel.isPending ? "Cancelling…" : "Yes, cancel it"}
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")} disabled={cancel.isPending}>Keep appointment</Button>
          </div>
          {cancel.isError && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-2 text-sm text-red-800">{messageFor(cancel.error)}</p>}
        </div>
      )}

      {mode === "reschedule" && (
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-800">Pick a new time</p>
          <label htmlFor={`date-${a.id}`} className="sr-only">New date</label>
          <input id={`date-${a.id}`} type="date" className={`${inputClass} mt-2 !w-auto`} min={addDays(todayInClinic(), 1)} value={date} onChange={(e) => { setDate(e.target.value); setPicked(""); }} />
          <p className="mt-2 text-xs text-slate-500">{formatShortDate(date)} (India time)</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Available times">
            {slots.isPending && <span className="text-sm text-slate-500">Loading times…</span>}
            {slots.data?.length === 0 && <span className="text-sm text-slate-500">No free times on this day. Try another date.</span>}
            {slots.data?.map((s) => (
              <Button key={s.start} variant={picked === s.start ? undefined : "outline"} aria-pressed={picked === s.start} onClick={() => setPicked(s.start)}>
                {s.label}
              </Button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => reschedule.mutate({ id: a.id, startTime: picked })} disabled={!picked || reschedule.isPending}>
              {reschedule.isPending ? "Moving…" : "Confirm new time"}
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")} disabled={reschedule.isPending}>Back</Button>
          </div>
          {reschedule.isError && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-2 text-sm text-red-800">{messageFor(reschedule.error)}</p>}
        </div>
      )}
    </div>
  );
}
