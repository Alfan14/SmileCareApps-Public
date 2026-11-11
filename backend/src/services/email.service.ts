import nodemailer from "nodemailer";
import { env } from "../config/env";

export type BookingConfirmation = {
  name: string;
  treatment: string;
  whenText: string;
  location: string;
  meetLink: string | null;
  invoiceNo: string;
};


type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: MailTransporter | undefined;

function getTransporter(): MailTransporter | null {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    if (env.NODE_ENV === "production") {
      throw new Error("SMTP_USER and SMTP_PASS must be configured in production to send booking confirmation emails");
    }
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

/** Returns true only when the message was actually accepted by the configured SMTP server. */
export async function sendBookingConfirmation(to: string, data: BookingConfirmation): Promise<boolean> {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn("SMTP is not configured; booking confirmation email skipped outside production.");
    return false;
  }

  const escapeMap: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  };
  const safe = (value: string) => value.replace(/[&<>"']/g, (character) => escapeMap[character] ?? character);
  const videoLine = data.meetLink
    ? `<p><strong>Video consultation:</strong> <a href="${safe(data.meetLink)}">Join consultation</a></p>`
    : "";
  await mailer.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: `${env.CLINIC_NAME}: booking confirmed — ${data.invoiceNo}`,
    text: [
      `Hello ${data.name},`,
      "Your SmileCare Clinic appointment is confirmed.",
      `Treatment: ${data.treatment}`,
      `Appointment: ${data.whenText}`,
      `Clinic: ${data.location}`,
      `Invoice: ${data.invoiceNo}`,
      ...(data.meetLink ? [`Video consultation: ${data.meetLink}`] : []),
      "Please keep your invoice number for reference.",
    ].join("\n\n"),
    html: `<!doctype html><html><body><h2>${safe(env.CLINIC_NAME)} — appointment confirmed</h2><p>Hello ${safe(data.name)},</p><p>Your SmileCare Clinic appointment is confirmed.</p><p><strong>Treatment:</strong> ${safe(data.treatment)}</p><p><strong>Appointment:</strong> ${safe(data.whenText)}</p><p><strong>Clinic:</strong> ${safe(data.location)}</p><p><strong>Invoice:</strong> ${safe(data.invoiceNo)}</p>${videoLine}<p>Please keep your invoice number for reference.</p></body></html>`,
  });
  return true;
}

// ---------------------------------------------------------------------------
// Notification emails (dentist + patient). All helpers are best-effort: a failed email must never
// roll back a booking, cancellation or refund, so callers use notify() which swallows and logs errors.
// ---------------------------------------------------------------------------

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

export type NoticeEvent = "NEW_BOOKING" | "CANCELLED" | "RESCHEDULED" | "REFUND_FAILED" | "PAYMENT_FAILED";

export type AppointmentNotice = {
  event: NoticeEvent;
  patientName: string;
  patientEmail: string;
  patientPhone?: string | null | undefined;
  treatment: string;
  whenText: string;
  previousWhenText?: string | undefined;
  consultationType: string;
  reason?: string | null | undefined;
note?: string | undefined;
};

const SUBJECTS: Record<NoticeEvent, string> = {
  NEW_BOOKING: "New appointment booked",
  CANCELLED: "Appointment cancelled",
  RESCHEDULED: "Appointment rescheduled",
  REFUND_FAILED: "Action needed: refund failed",
  PAYMENT_FAILED: "Payment failed",
};

async function deliver(to: string, subject: string, lines: string[]): Promise<boolean> {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn(`SMTP is not configured; "${subject}" email skipped outside production.`);
    return false;
  }
  await mailer.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: `${env.CLINIC_NAME}: ${subject}`,
    text: lines.join("\n\n"),
    html: `<!doctype html><html><body><h2>${escapeHtml(subject)}</h2>${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}</body></html>`,
  });
  return true;
}

function noticeLines(n: AppointmentNotice): string[] {
  return [
    `Patient: ${n.patientName} (${n.patientEmail}${n.patientPhone ? `, ${n.patientPhone}` : ""})`,
    `Treatment: ${n.treatment} — ${n.consultationType === "VIDEO" ? "video consultation" : "in clinic"}`,
    ...(n.previousWhenText ? [`Previous time: ${n.previousWhenText}`] : []),
    `${n.previousWhenText ? "New time" : "When"}: ${n.whenText}`,
    ...(n.reason ? [`Reason: ${n.reason}`] : []),
    ...(n.note ? [n.note] : []),
  ];
}

/** Email the dentist (DENTIST_EMAIL). Returns false when no dentist address is configured. */
export async function sendDentistNotification(n: AppointmentNotice): Promise<boolean> {
  if (!env.DENTIST_EMAIL) return false;
  return deliver(env.DENTIST_EMAIL, SUBJECTS[n.event], noticeLines(n));
}

/** Email the patient about a cancellation, reschedule or refund. */
export async function sendPatientNotification(n: AppointmentNotice): Promise<boolean> {
  const intro: Record<NoticeEvent, string> = {
    NEW_BOOKING: "Your appointment is booked.",
    CANCELLED: "Your appointment has been cancelled. If you paid online, your refund is being processed and usually reaches your card in 5–10 business days.",
    RESCHEDULED: "Your appointment has been moved to the new time below.",
    REFUND_FAILED: "We could not process your refund automatically. The clinic has been notified and will contact you.",
    PAYMENT_FAILED: "Your payment did not go through, so the appointment was not confirmed. You can try booking again.",
  };
  return deliver(n.patientEmail, SUBJECTS[n.event], [`Hello ${n.patientName},`, intro[n.event], ...noticeLines(n).slice(1)]);
}

/** Fire-and-forget wrapper: logs failures, never throws. */
export async function notify(...jobs: Array<Promise<unknown>>): Promise<void> {
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === "rejected") console.error("[notify] email failed", r.reason);
}
