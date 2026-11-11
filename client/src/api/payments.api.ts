import type { CheckoutResponse, PaymentStatusResponse } from "../types/api";
import { api } from "./client";

/** Creates a Stripe Checkout session for a held appointment, or returns the still-open one. */
export const createCheckout = (appointmentId: string) =>
  api<CheckoutResponse>("/payments/checkout", { method: "POST", body: JSON.stringify({ appointmentId }) });

export const getPaymentStatus = (appointmentId: string) =>
  api<PaymentStatusResponse>(`/payments/appointments/${encodeURIComponent(appointmentId)}`);
