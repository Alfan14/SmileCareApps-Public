import { describe, expect, it } from "vitest";
import { isStripeCheckoutUrl, outcomeOf } from "./payment";

describe("isStripeCheckoutUrl", () => {
  it("accepts Stripe checkout links only", () => {
    expect(isStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_123")).toBe(true);
    expect(isStripeCheckoutUrl("http://checkout.stripe.com/c/pay/cs_test_123")).toBe(false);
    expect(isStripeCheckoutUrl("https://checkout.stripe.com.evil.example/pay")).toBe(false);
    expect(isStripeCheckoutUrl("https://evil.example/checkout.stripe.com")).toBe(false);
    expect(isStripeCheckoutUrl("javascript:alert(1)")).toBe(false);
    expect(isStripeCheckoutUrl("")).toBe(false);
  });
});

describe("outcomeOf", () => {
  it("is pending until the server says otherwise", () => {
    expect(outcomeOf(undefined)).toBe("pending");
    expect(outcomeOf({ appointmentStatus: "PENDING", payment: { status: "PENDING" } })).toBe("pending");
    expect(outcomeOf({ appointmentStatus: "PENDING", payment: null })).toBe("pending");
  });

  it("is paid when the payment is PAID or the appointment is confirmed", () => {
    expect(outcomeOf({ appointmentStatus: "CONFIRMED", payment: { status: "PAID" } })).toBe("paid");
    expect(outcomeOf({ appointmentStatus: "CONFIRMED" })).toBe("paid");
    expect(outcomeOf({ appointmentStatus: "PENDING", payment: { status: "PAID" } })).toBe("paid");
  });

  it("is refunded when the slot was taken while paying", () => {
    expect(outcomeOf({ appointmentStatus: "CANCELLED", payment: { status: "REFUNDED" } })).toBe("refunded");
  });

  it("is failed for a failed payment or a cancelled appointment without a pending payment", () => {
    expect(outcomeOf({ appointmentStatus: "PENDING", payment: { status: "FAILED" } })).toBe("failed");
    expect(outcomeOf({ appointmentStatus: "CANCELLED", payment: { status: "FAILED" } })).toBe("failed");
    expect(outcomeOf({ appointmentStatus: "CANCELLED", payment: null })).toBe("failed");
  });

  it("does not call it failed while the payment is still pending (webhook delay after the hold expired)", () => {
    expect(outcomeOf({ appointmentStatus: "CANCELLED", payment: { status: "PENDING" } })).toBe("pending");
  });
});
