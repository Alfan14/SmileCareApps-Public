import { z } from "zod";

export const checkoutSchema = z.object({
  appointmentId: z.string().min(1).max(128),
}).strict();

export const paymentAppointmentParamsSchema = z.object({
  appointmentId: z.string().min(1).max(128),
}).strict();

export type CheckoutBody = z.infer<typeof checkoutSchema>;
