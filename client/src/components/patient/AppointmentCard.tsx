import { CalendarPlus, CreditCard, Receipt, Video, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useStartCheckout } from "../../hooks/usePayment";
import { isAwaitingPayment } from "../../lib/appointments";
import { clinic, telHref } from "../../lib/clinic";
import { dayParts } from "../../lib/display";
import { downloadTextFile } from "../../lib/download";
import { formatSlotTime } from "../../lib/dates";
import { formatPaise } from "../../lib/format";
import { buildIcs } from "../../lib/ics";
import type { MyAppointment } from "../../types/api";
import { Button } from "../ui/Button";
import { ReviewForm } from "../reviews/ReviewForm";
import { ManageAppointment } from "./ManageAppointment";
import { AppointmentStatus } from "./StatusBadge";

type Props = { appointment: MyAppointment; now: number; compact?: boolean };

const isHttps = (value: string | null) => {
  try {
    return value !== null && new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

export function AppointmentCard({ appointment: a, now, compact = false }: Props) {
  const { day, month, weekday } = dayParts(a.startTime);
  const awaiting = isAwaitingPayment(a, now);
  const upcomingConfirmed = a.status === "CONFIRMED" && Date.parse(a.startTime) >= now;
  const video = a.consultationType === "VIDEO";
  const checkout = useStartCheckout();

  function addToCalendar() {
    const end = a.endTime ?? new Date(Date.parse(a.startTime) + 30 * 60_000).toISOString();
    const ics = buildIcs({
      uid: a.id,
      title: `${a.treatmentName} at ${clinic.name}`,
      start: a.startTime,
      end,
      location: video ? "Video consultation (Google Meet)" : `${clinic.name}, ${clinic.address}`,
      description: video && a.meetLink ? `Join: ${a.meetLink}` : `Appointment with Dr. Aarav Mehta. Questions? Call ${clinic.phone}.`,
    });
    downloadTextFile(`smilecare-appointment-${a.id}.ics`, ics, "text/calendar;charset=utf-8");
  }

  function payNow() {
    checkout.mutate({
      appointmentId: a.id,
      treatmentName: a.treatmentName,
      slotStart: a.startTime,
      consultationType: a.consultationType,
      bookingPrice: a.amount ?? 0,
      holdExpiresAt: a.holdExpiresAt,
    });
  }

  return (
    <article className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-deep">
        <span className="text-center leading-tight">
          <span className="block text-[10px] font-semibold uppercase">{weekday}</span>
          <span className="block text-xl font-bold">{day}</span>
          <span className="block text-[10px] font-semibold uppercase">{month}</span>
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-brand-deep">{a.treatmentName}</h3>
          <AppointmentStatus appointment={a} now={now} />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {formatSlotTime(a.startTime)} <span className="text-slate-400">(India time)</span>
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
          {video ? <Video className="h-4 w-4" aria-hidden="true" /> : <Building2 className="h-4 w-4" aria-hidden="true" />}
          {video ? "Video consultation" : `${clinic.name}, ${clinic.address}`}
        </p>

        {(upcomingConfirmed || awaiting || a.invoiceId) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {upcomingConfirmed && video && isHttps(a.meetLink) && (
              <a
                href={a.meetLink ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand-strong px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
              >
                <Video className="h-4 w-4" aria-hidden="true" /> Join video call
              </a>
            )}
            {upcomingConfirmed && (
              <Button variant="outline" onClick={addToCalendar}>
                <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Add to calendar
              </Button>
            )}
            {awaiting && (
              <Button onClick={payNow} disabled={checkout.isPending || checkout.isSuccess}>
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                {checkout.isSuccess ? "Opening Stripe…" : checkout.isPending ? "Preparing…" : a.amount ? `Pay ${formatPaise(a.amount)} now` : "Pay now"}
              </Button>
            )}
            {a.invoiceId && (
              <Link
                to={`/patient/invoices/${a.invoiceId}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-brand-deep"
              >
                <Receipt className="h-4 w-4" aria-hidden="true" />
                Invoice {a.invoiceNumber ?? ""}
              </Link>
            )}
          </div>
        )}

        {checkout.isError && (
          <p role="alert" className="mt-2 rounded-xl bg-red-50 p-2 text-sm text-red-800">
            {checkout.error.message}
          </p>
        )}

        {!compact && (upcomingConfirmed || awaiting) && <ManageAppointment appointment={a} now={now} />}

        {!compact && a.status === "COMPLETED" && !a.reviewId && <ReviewForm appointmentId={a.id} />}
        {a.status === "COMPLETED" && a.reviewId && <p className="mt-3 text-xs text-slate-500">Thanks for reviewing this visit.</p>}

        {a.paymentStatus === "FAILED" && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 p-2 text-sm text-red-800">
            Your payment didn&apos;t go through{a.paymentFailureReason ? ` (${a.paymentFailureReason})` : ""}, so this time was released. You can book again anytime.
          </p>
        )}
        {(a.paymentStatus === "REFUND_PENDING" || a.paymentStatus === "REFUNDED") && (
          <p className="mt-3 text-xs text-slate-500">
            {a.paymentStatus === "REFUNDED" ? "Your booking fee has been refunded." : "Your refund is being processed (5–10 business days)."}
          </p>
        )}
        {a.paymentStatus === "REFUND_FAILED" && (
          <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-2 text-sm text-amber-900">
            We couldn&apos;t refund automatically. The clinic has been notified; you can also <a href={telHref} className="font-semibold underline">call us</a>.
          </p>
        )}
      </div>
    </article>
  );
}
