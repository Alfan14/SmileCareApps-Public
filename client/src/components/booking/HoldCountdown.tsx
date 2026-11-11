import { Timer } from "lucide-react";
import { formatCountdown, useCountdown } from "../../hooks/useCountdown";

/** Counts down to the moment the held slot is released. */
export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const seconds = useCountdown(expiresAt) ?? 0;

  if (seconds === 0) {
    return (
      <p role="status" className="flex items-center gap-2 font-semibold text-red-700">
        <Timer className="h-5 w-5" aria-hidden="true" />
        Your hold has expired. Please choose a time again.
      </p>
    );
  }
  return (
    <p role="timer" aria-label={`Hold expires in ${formatCountdown(seconds)}`} className="flex items-center gap-2 font-semibold text-brand-deep">
      <Timer className="h-5 w-5" aria-hidden="true" />
      Held for you: <span className="tabular-nums">{formatCountdown(seconds)}</span>
    </p>
  );
}
