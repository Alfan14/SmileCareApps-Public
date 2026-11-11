import { CheckCircle2, Lock } from "lucide-react";
import { useCountdown } from "../../hooks/useCountdown";
import { useStartCheckout } from "../../hooks/usePayment";
import { clinicDateOf, formatLongDate, formatSlotTime } from "../../lib/dates";
import { formatPaise } from "../../lib/format";
import type { Appointment, ConsultationType, Treatment } from "../../types/api";
import { Button, ButtonLink } from "../ui/Button";
import { Container } from "../ui/Container";
import { HoldCountdown } from "./HoldCountdown";
import { TestModeNote } from "./TestModeNote";

export type Reserved = { appointment: Appointment; treatment: Treatment; slotStart: string; type: ConsultationType };

/** The slot is held (PENDING). This screen sends the patient to Stripe to pay and confirm it. */
export function ReservedView({ reserved, onReset }: { reserved: Reserved; onReset: () => void }) {
  const { appointment, treatment, slotStart, type } = reserved;
  const checkout = useStartCheckout();
  const secondsLeft = useCountdown(appointment.holdExpiresAt);
  const expired = secondsLeft === 0;
  const redirecting = checkout.isSuccess;

  function pay() {
    checkout.mutate({
      appointmentId: appointment.id,
      treatmentName: treatment.name,
      slotStart,
      consultationType: type,
      bookingPrice: treatment.bookingPrice,
      holdExpiresAt: appointment.holdExpiresAt,
    });
  }

  return (
    <section className="py-12 sm:py-16">
      <Container className="max-w-2xl">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-xl sm:p-10">
          <CheckCircle2 className="mx-auto h-12 w-12 text-brand-strong" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-bold">Your slot is held</h1>
          <p className="mt-2 text-slate-600">Complete the payment to confirm your appointment.</p>
          {appointment.holdExpiresAt && (
            <div className="mt-3 flex justify-center">
              <HoldCountdown expiresAt={appointment.holdExpiresAt} />
            </div>
          )}

          <dl className="mt-6 grid gap-3 rounded-2xl bg-brand-soft/60 p-5 text-left text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Treatment</dt>
              <dd className="font-semibold text-brand-deep">{treatment.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Date and time</dt>
              <dd className="font-semibold text-brand-deep">
                {formatLongDate(clinicDateOf(slotStart))}, {formatSlotTime(slotStart)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Consultation</dt>
              <dd className="font-semibold text-brand-deep">{type === "VIDEO" ? "Video consultation" : "In-clinic visit"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Amount to pay now</dt>
              <dd className="font-semibold text-brand-deep">{formatPaise(treatment.bookingPrice)}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <TestModeNote />
          </div>

          {checkout.isError && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-left text-sm text-red-800">
              {checkout.error.message}{" "}
              <ButtonLink to={`/book/success?appointmentId=${encodeURIComponent(appointment.id)}`} variant="ghost" className="!px-2 !py-1 underline">
                Check payment status
              </ButtonLink>
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={pay} disabled={expired || checkout.isPending || redirecting}>
              <Lock className="h-5 w-5" aria-hidden="true" />
              {redirecting ? "Opening Stripe…" : checkout.isPending ? "Preparing payment…" : `Pay ${formatPaise(treatment.bookingPrice)} securely`}
            </Button>
            <Button variant="outline" size="lg" onClick={onReset} disabled={checkout.isPending || redirecting}>
              Choose a different time
            </Button>
          </div>
          <p className="mt-4 text-xs text-slate-500">You will be taken to Stripe's secure checkout. We never see your card details.</p>
        </div>
      </Container>
    </section>
  );
}
