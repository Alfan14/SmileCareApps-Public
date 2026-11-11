import { cn } from "../../lib/cn";
import { isAwaitingPayment, statusLabel } from "../../lib/appointments";
import type { MyAppointment } from "../../types/api";

const tones = {
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-900",
  teal: "bg-brand-soft text-brand-deep",
  grey: "bg-slate-100 text-slate-600",
  red: "bg-red-50 text-red-800",
};

export type Tone = keyof typeof tones;

export function Chip({ tone, children }: { tone: Tone; children: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function AppointmentStatus({ appointment: a, now }: { appointment: MyAppointment; now: number }) {
  const tone: Tone =
    a.status === "CONFIRMED" ? "green" : a.status === "COMPLETED" ? "teal" : a.status === "NO_SHOW" ? "red" : isAwaitingPayment(a, now) ? "amber" : "grey";
  return <Chip tone={tone}>{statusLabel(a, now)}</Chip>;
}
