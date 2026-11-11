import type { ConsultationType } from "../types/api";

// Remembers the booking while the visitor is on Stripe's page, so the success page can show details
// even if Stripe's return link only carries a session id. Stored per browser tab and cleared after payment.
// It holds no personal data: only the treatment name, time and fee.

export type PendingPayment = {
  appointmentId: string;
  treatmentName: string;
  slotStart: string;
  consultationType: ConsultationType;
  bookingPrice: number;
  holdExpiresAt: string | null;
};

const KEY = "sc_pending_payment";

export function savePendingPayment(value: PendingPayment) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage can be blocked (private mode). The success page then relies on the link alone.
  }
}

export function loadPendingPayment(): PendingPayment | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<PendingPayment>;
    const ok =
      typeof v.appointmentId === "string" &&
      typeof v.treatmentName === "string" &&
      typeof v.slotStart === "string" &&
      (v.consultationType === "IN_CLINIC" || v.consultationType === "VIDEO") &&
      typeof v.bookingPrice === "number" &&
      (typeof v.holdExpiresAt === "string" || v.holdExpiresAt === null);
    return ok ? (v as PendingPayment) : null;
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
