import type { ReactNode } from "react";
import { Building2, CalendarDays, Stethoscope, UserRound, Video } from "lucide-react";
import { clinic, doctor } from "../../lib/clinic";
import { clinicDateOf, formatLongDate, formatSlotTime } from "../../lib/dates";
import { formatDuration, formatPaise } from "../../lib/format";
import type { ConsultationType, Treatment } from "../../types/api";

type Props = { treatment: Treatment | undefined; slotStart: string | null; type: ConsultationType };

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-brand">{icon}</span>
      <div className="text-sm">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="font-medium text-slate-800">{children}</dd>
      </div>
    </div>
  );
}

const empty = <span className="font-normal text-slate-400">Not selected yet</span>;

export function BookingSummary({ treatment, slotStart, type }: Props) {
  return (
    <aside aria-label="Booking summary" className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold">Booking summary</h2>
      <dl className="mt-4 space-y-4">
        <Row icon={<Stethoscope className="h-5 w-5" aria-hidden="true" />} label="Treatment">
          {treatment ? (
            <>
              {treatment.name}
              <span className="block text-xs font-normal text-slate-500">{formatDuration(treatment.durationMin)}</span>
            </>
          ) : (
            empty
          )}
        </Row>
        <Row icon={<UserRound className="h-5 w-5" aria-hidden="true" />} label="Dentist">
          {doctor.name}
        </Row>
        <Row icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />} label="Date and time">
          {slotStart ? (
            <>
              {formatLongDate(clinicDateOf(slotStart))}
              <span className="block text-xs font-normal text-slate-500">{formatSlotTime(slotStart)} (India time)</span>
            </>
          ) : (
            empty
          )}
        </Row>
        <Row icon={type === "VIDEO" ? <Video className="h-5 w-5" aria-hidden="true" /> : <Building2 className="h-5 w-5" aria-hidden="true" />} label="Consultation">
          {type === "VIDEO" ? "Video consultation" : "In-clinic visit"}
          {type === "IN_CLINIC" && <span className="block text-xs font-normal text-slate-500">{clinic.address}</span>}
        </Row>
      </dl>

      <div className="mt-5 rounded-2xl bg-brand-soft p-4">
        <p className="text-xs text-slate-600">Online booking fee</p>
        <p className="text-2xl font-bold text-brand-deep">{treatment ? formatPaise(treatment.bookingPrice) : "–"}</p>
        <p className="mt-1 text-xs text-slate-600">You pay on Stripe’s secure page right after reserving your slot.</p>
      </div>
    </aside>
  );
}
