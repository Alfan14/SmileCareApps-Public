import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "../api/client";
import { createCheckout, getPaymentStatus } from "../api/payments.api";
import { isStripeCheckoutUrl, outcomeOf, POLL_MS } from "../lib/payment";
import { savePendingPayment } from "../lib/pendingPayment";
import type { PendingPayment } from "../lib/pendingPayment";
import { redirectTo } from "../lib/redirect";
import { authKey } from "./useAuth";

/** Asks the server for a Stripe Checkout session, remembers the booking, then sends the browser to Stripe. */
export function useStartCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pending: PendingPayment) => {
      const { checkoutUrl } = await createCheckout(pending.appointmentId);
      if (!isStripeCheckoutUrl(checkoutUrl)) throw new Error("We received an unexpected payment link, so we stopped. Please try again.");
      savePendingPayment(pending);
      redirectTo(checkoutUrl);
    },
    onError: (err) => {
      if ((err as ApiError).code === "UNAUTHENTICATED") queryClient.setQueryData(authKey, null); // expired session: go log in
    },
  });
}

/**
 * Payment and invoice status for one appointment. Keeps asking every couple of seconds until the answer is final,
 * because Stripe's webhook can arrive a moment after the customer returns to the site.
 */
export function usePaymentStatus(appointmentId: string, options: { stopPolling: boolean }) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["payment", appointmentId],
    queryFn: async () => {
      try {
        return await getPaymentStatus(appointmentId);
      } catch (err) {
        if ((err as ApiError).status === 401) queryClient.setQueryData(authKey, null);
        throw err;
      }
    },
    enabled: appointmentId !== "",
    // Retry once for network or server hiccups, never for 4xx answers (not logged in, not found): they will not change.
    retry: (failureCount, err) => {
      const status = (err as ApiError).status;
      return failureCount < 1 && !(typeof status === "number" && status < 500);
    },
    staleTime: 0,
    refetchInterval: (query) => (options.stopPolling || outcomeOf(query.state.data) !== "pending" ? false : POLL_MS),
  });
}
