import type { Request, Response } from "express";
import type Stripe from "stripe";
import { env } from "../config/env";
import { HttpError } from "../middleware/errors";
import { getStripeClient, handleStripeEvent, startCheckoutForAppointment, getPaymentForAppointment } from "../services/payments.service";
import type { CheckoutBody } from "../validators/payments.schema";

export async function createCheckout(req: Request, res: Response) {
  if (!req.user?.id) throw new HttpError(401, "UNAUTHENTICATED", "Please log in");
  const body = res.locals.body as CheckoutBody;
  const checkout = await startCheckoutForAppointment(req.user.id, body.appointmentId);
  res.status(checkout.reused ? 200 : 201).json({
    message: checkout.reused ? "Existing checkout session returned" : "Checkout session created",
    checkoutUrl: checkout.url,
    sessionId: checkout.sessionId,
    expiresAt: checkout.expiresAt,
  });
}

export async function paymentStatus(req: Request, res: Response) {
  if (!req.user?.id) throw new HttpError(401, "UNAUTHENTICATED", "Please log in");
  const appointmentId = String(req.params.appointmentId ?? "");
  res.json(await getPaymentForAppointment(req.user.id, appointmentId));
}

/** Stripe must receive the original raw bytes, not an object parsed by express.json(). */
export async function webhook(req: Request, res: Response) {
  const signature = req.get("stripe-signature");
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || (env.NODE_ENV !== "production" && env.STRIPE_SECRET_KEY.startsWith("sk_live_"))) {
    res.status(503).json({ error: "Stripe test/payment configuration is not available", code: "PAYMENTS_NOT_CONFIGURED" });
    return;
  }
  const isRawBuffer = Buffer.isBuffer(req.body);

  if (!signature || !isRawBuffer) {
    console.error("[Stripe Webhook] Invalid request format:", {
      hasSignature: Boolean(signature),
      isRawBuffer,
      contentType: req.get("content-type"),
      bodyType: typeof req.body,
    });

    res.status(400).json({
      error: "A Stripe signature and raw request body are required",
      code: "INVALID_WEBHOOK_REQUEST",
    });
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error(
      "[Stripe Webhook] Signature verification failed:",
      error instanceof Error ? error.message : String(error)
    );

    res.status(400).json({
      error: "Invalid Stripe webhook signature",
      code: "INVALID_WEBHOOK_SIGNATURE",
    });
    return;
  }

  // Processing errors return 5xx so Stripe retries; signature errors return 400 and do not retry.
  await handleStripeEvent(event);
  res.status(200).json({ received: true });
}
