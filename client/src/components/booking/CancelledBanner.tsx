import { AlertTriangle } from "lucide-react";
import { formatCountdown, useCountdown } from "../../hooks/useCountdown";
import { useStartCheckout } from "../../hooks/usePayment";
import type { PendingPayment } from "../../lib/pendingPayment";
import { Button } from "../ui/Button";
import { Container } from "../ui/Container";

type Props = { pending: PendingPayment | null; onDismiss: () => void };

/** Shown when the visitor comes back from Stripe without paying (Stripe's cancel link: /book?cancelled=1). */
export function CancelledBanner({ pending, onDismiss }: Props) {
  const checkout = useStartCheckout();
  const seconds = useCountdown(pending?.holdExpiresAt ?? null);
  const canResume = pending !== null && seconds !== null && seconds > 0;

  return (
    <Container className="pt-6">
      <div role="status" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center">
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="flex-1">
          <strong>Payment was cancelled.</strong>{" "}
          {canResume
            ? `Your slot is still held for ${formatCountdown(seconds)}. You can resume the payment.`
            : "Your hold has expired. Please choose a time again."}
          {checkout.isError && <span className="mt-1 block text-red-800">{checkout.error.message}</span>}
        </p>
        <div className="flex gap-2">
          {canResume && (
            <Button onClick={() => checkout.mutate(pending)} disabled={checkout.isPending || checkout.isSuccess}>
              {checkout.isSuccess ? "Opening Stripe…" : "Resume payment"}
            </Button>
          )}
          <Button variant="outline" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    </Container>
  );
}
