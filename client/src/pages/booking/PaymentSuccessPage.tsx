import { CheckCircle2, Clock, Loader2, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { ApiError } from "../../api/client";
import { TestModeNote } from "../../components/booking/TestModeNote";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";
import { ErrorState } from "../../components/ui/StateMessage";
import { useStartCheckout, usePaymentStatus } from "../../hooks/usePayment";
import { clinicDateOf, formatLongDate, formatSlotTime } from "../../lib/dates";
import { formatPaise } from "../../lib/format";
import { outcomeOf, POLL_LIMIT_MS } from "../../lib/payment";
import { clearPendingPayment, loadPendingPayment } from "../../lib/pendingPayment";

function Shell({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="py-12 sm:py-16">
      <Container className="max-w-xl">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-xl sm:p-10" aria-live="polite">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-deep">{icon}</div>
          <h1 className="mt-4 text-3xl font-bold">{title}</h1>
          {children}
        </div>
      </Container>
    </section>
  );
}

/**
 * Where Stripe sends the customer after paying: /book/success?appointmentId=...&session_id=...
 * The card is charged on Stripe's side, but the appointment is only confirmed when Stripe's webhook reaches our server,
 * so this page keeps asking the server until the answer is final.
 */
export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const [pending] = useState(() => loadPendingPayment());
  const appointmentId = params.get("appointmentId") ?? pending?.appointmentId ?? "";
  const summary = pending && pending.appointmentId === appointmentId ? pending : null;

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (timedOut) return;
    const id = window.setTimeout(() => setTimedOut(true), POLL_LIMIT_MS);
    return () => window.clearTimeout(id);
  }, [timedOut]);

  const status = usePaymentStatus(appointmentId, { stopPolling: timedOut });
  const retry = useStartCheckout();
  const outcome = outcomeOf(status.data);

  useEffect(() => {
    if (outcome === "paid") clearPendingPayment();
  }, [outcome]);

  const details = summary && (
    <dl className="mt-6 grid gap-3 rounded-2xl bg-brand-soft/60 p-5 text-left text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs text-slate-500">Treatment</dt>
        <dd className="font-semibold text-brand-deep">{summary.treatmentName}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Date and time</dt>
        <dd className="font-semibold text-brand-deep">
          {formatLongDate(clinicDateOf(summary.slotStart))}, {formatSlotTime(summary.slotStart)}
        </dd>
      </div>
    </dl>
  );

  if (!appointmentId) {
    return (
      <Shell icon={<Clock className="h-7 w-7" aria-hidden="true" />} title="Nothing to confirm">
        <p className="mt-3 text-slate-600">We could not tell which booking to check. Start from the booking page.</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink to="/book" size="lg">
            Book an appointment
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  if (status.isError) {
    if ((status.error as ApiError).status === 404) {
      return (
        <Shell icon={<XCircle className="h-7 w-7" aria-hidden="true" />} title="Booking not found">
          <p className="mt-3 text-slate-600">We could not find this booking in your account.</p>
          <div className="mt-6 flex justify-center">
            <ButtonLink to="/patient" size="lg">
              Go to my dashboard
            </ButtonLink>
          </div>
        </Shell>
      );
    }
    return (
      <Shell icon={<XCircle className="h-7 w-7" aria-hidden="true" />} title="We could not check your payment">
        <div className="mt-5">
          <ErrorState message={status.error.message} onRetry={() => void status.refetch()} />
        </div>
      </Shell>
    );
  }

  if (outcome === "paid") {
    const payment = status.data?.payment;
    const invoice = status.data?.invoice;
    return (
      <Shell icon={<CheckCircle2 className="h-7 w-7 text-brand-strong" aria-hidden="true" />} title="Your appointment is confirmed">
        <p className="mt-2 text-slate-600">Thank you! Your payment was received.</p>
        {details}
        <dl className="mt-4 grid gap-3 text-left text-sm sm:grid-cols-2">
          {typeof payment?.amount === "number" && (
            <div>
              <dt className="text-xs text-slate-500">Amount paid</dt>
              <dd className="font-semibold text-brand-deep">{formatPaise(payment.amount)}</dd>
            </div>
          )}
          {invoice?.number && (
            <div>
              <dt className="text-xs text-slate-500">Invoice number</dt>
              <dd className="font-mono font-semibold text-brand-deep">{invoice.number}</dd>
            </div>
          )}
        </dl>
        <p className="mt-5 text-sm text-slate-600">A confirmation email is on its way.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/patient" size="lg">
            Go to my dashboard
          </ButtonLink>
          <ButtonLink to="/" variant="outline" size="lg">
            Back to home
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  if (outcome === "refunded") {
    return (
      <Shell icon={<RotateCcw className="h-7 w-7" aria-hidden="true" />} title="That time was just taken">
        <p className="mt-3 text-slate-600">
          Someone else booked this time while your payment was being processed, so your payment has been refunded automatically. Please choose another time.
        </p>
        <div className="mt-6 flex justify-center">
          <ButtonLink to="/book" size="lg">
            Choose another time
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  if (outcome === "failed") {
    return (
      <Shell icon={<XCircle className="h-7 w-7 text-red-600" aria-hidden="true" />} title="Payment not completed">
        <p className="mt-3 text-slate-600">Your payment did not go through, and the appointment is not confirmed.</p>
        {details}
        {retry.isError && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {retry.error.message}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {summary && (
            <Button size="lg" onClick={() => retry.mutate(summary)} disabled={retry.isPending || retry.isSuccess}>
              {retry.isSuccess ? "Opening Stripe…" : "Try payment again"}
            </Button>
          )}
          <ButtonLink to="/book" variant={summary ? "outline" : "primary"} size="lg">
            Choose a time again
          </ButtonLink>
        </div>
        <div className="mt-6">
          <TestModeNote />
        </div>
      </Shell>
    );
  }

  // pending
  if (timedOut) {
    return (
      <Shell icon={<Clock className="h-7 w-7" aria-hidden="true" />} title="Still processing">
        <p className="mt-3 text-slate-600">
          Your payment is taking longer than usual to confirm. If you already paid, there is no need to pay again: it will show up in your dashboard shortly.
        </p>
        {details}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            size="lg"
            onClick={() => {
              setTimedOut(false);
              void status.refetch();
            }}
          >
            Check again
          </Button>
          <ButtonLink to="/patient" variant="outline" size="lg">
            Go to my dashboard
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  return (
    <Shell icon={<Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />} title="Confirming your payment">
      <p role="status" className="mt-3 text-slate-600">
        This usually takes a few seconds. Please keep this page open.
      </p>
      {details}
    </Shell>
  );
}
