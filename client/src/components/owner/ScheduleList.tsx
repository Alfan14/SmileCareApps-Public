import { Building2, Phone, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { useRetryRefund, useUpdateAppointmentStatus } from "../../hooks/useOwnerData";
import { formatSlotTime } from "../../lib/dates";
import type { OwnerAppointment, AppointmentStatus } from "../../types/api";
import { AppointmentStatus as StatusChip, Chip } from "../patient/StatusBadge";
import { Button } from "../ui/Button";
import { ConfirmButton } from "./ConfirmButton";

const GRACE_MS = 15 * 60_000; // "mark completed" opens a little before the start time

/** Shown when Stripe rejected a refund: the patient is owed money, so make the retry one click. */
function RetryRefund({ appointmentId }: { appointmentId: string }) {
  const retry = useRetryRefund();
  return (
    <>
      <Button variant="outline" onClick={() => retry.mutate(appointmentId)} disabled={retry.isPending || retry.isSuccess}>
        {retry.isSuccess ? "Refund retried" : retry.isPending ? "Retrying…" : "Retry refund"}
      </Button>
      {retry.isError && <span role="alert" className="text-sm text-red-700">{retry.error.message}</span>}
    </>
  );
}

function Row({ a, now, busy, onStatus }: { a: OwnerAppointment; now: number; busy: boolean; onStatus: (id: string, status: AppointmentStatus) => void }) {
  const started = Date.parse(a.startTime) - GRACE_MS <= now;
  const video = a.consultationType === "VIDEO";

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
      <p className="w-28 shrink-0 text-lg font-bold text-brand-deep">{formatSlotTime(a.startTime)}</p>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-800">{a.patientName}</h3>
          <StatusChip appointment={a} now={now} />
          {a.isNewPatient && <Chip tone="teal">New patient</Chip>}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          <span>{a.treatmentName}</span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            {video ? <Video className="h-4 w-4" aria-hidden="true" /> : <Building2 className="h-4 w-4" aria-hidden="true" />}
            {video ? "Video" : "In clinic"}
          </span>
          {a.patientPhone && (
            <a href={`tel:${a.patientPhone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1 text-brand-strong hover:underline">
              <Phone className="h-4 w-4" aria-hidden="true" />
              {a.patientPhone}
            </a>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {a.status === "CONFIRMED" && started && (
          <>
            <Button onClick={() => onStatus(a.id, "COMPLETED")} disabled={busy}>
              Mark completed
            </Button>
            <Button variant="outline" onClick={() => onStatus(a.id, "NO_SHOW")} disabled={busy}>
              No-show
            </Button>
          </>
        )}
        {(a.status === "CONFIRMED" || a.status === "PENDING") && (
          <ConfirmButton label="Cancel" confirmLabel="Yes, cancel" onConfirm={() => onStatus(a.id, "CANCELLED")} disabled={busy} />
        )}
        {a.paymentStatus === "REFUND_FAILED" && <RetryRefund appointmentId={a.id} />}
        {a.status === "COMPLETED" && a.patientId && (
          <Link
            to={`/owner/records?${new URLSearchParams({ patientId: a.patientId, appointmentId: a.id, title: a.treatmentName }).toString()}`}
            className="rounded-full border border-brand-strong px-4 py-2 text-sm font-semibold text-brand-deep hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            Add record
          </Link>
        )}
      </div>
    </li>
  );
}

/** One day's appointments in time order, with the actions the owner needs during the day. */
export function ScheduleList({ appointments, now }: { appointments: OwnerAppointment[]; now: number }) {
  const update = useUpdateAppointmentStatus();
  const sorted = [...appointments].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));

  return (
    <div className="space-y-3">
      {update.isError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {update.error.message}
        </p>
      )}
      <ul className="space-y-3">
        {sorted.map((a) => (
          <Row key={a.id} a={a} now={now} busy={update.isPending && update.variables?.id === a.id} onStatus={(id, status) => update.mutate({ id, status })} />
        ))}
      </ul>
    </div>
  );
}
