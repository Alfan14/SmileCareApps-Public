import type { PaymentStatusResponse } from "../types/api";

export const POLL_MS = 2000; // how often the success page asks the server
export const POLL_LIMIT_MS = 60_000; // after this the page stops asking and offers "Check again"

/** Only ever send the browser to Stripe's checkout domain, even if the API answer were tampered with. */
export function isStripeCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.stripe.com";
  } catch {
    return false;
  }
}

export type PaymentOutcome = "paid" | "refunded" | "failed" | "pending";

/**
 * Turns the server's status into one of four screens.
 * "Pending" also covers the short gap between Stripe taking the card and our webhook updating the database.
 * An appointment can read CANCELLED in that gap (its hold ran out), so CANCELLED only means failure
 * once the payment itself is no longer pending.
 */
export function outcomeOf(status: PaymentStatusResponse | undefined): PaymentOutcome {
  if (!status) return "pending";
  const payment = status.payment?.status;
  if (payment === "REFUNDED") return "refunded";
  if (payment === "PAID" || status.appointmentStatus === "CONFIRMED" || status.appointmentStatus === "COMPLETED") return "paid";
  if (payment === "FAILED" || (status.appointmentStatus === "CANCELLED" && payment !== "PENDING")) return "failed";
  return "pending";
}
