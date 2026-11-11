import { releaseExpiredHolds } from "../services/appointments.service";

export const EXPIRED_HOLD_SWEEP_INTERVAL_MS = 60_000;
let interval: NodeJS.Timeout | undefined;

async function runSweep(): Promise<void> {
  try {
    const released = await releaseExpiredHolds();
    if (released > 0) console.info(`[booking] released ${released} expired hold(s)`);
  } catch (error) {
    // Keep the scheduler alive if a transient database issue occurs.
    console.error("[booking] failed to release expired holds", error);
  }
}

/** Start one immediate sweep and then sweep once per minute. Calling twice is idempotent. */
export function startReleaseExpiredHoldsJob(): () => void {
  if (interval) return stopReleaseExpiredHoldsJob;
  void runSweep();
  interval = setInterval(() => void runSweep(), EXPIRED_HOLD_SWEEP_INTERVAL_MS);
  interval.unref();
  return stopReleaseExpiredHoldsJob;
}

export function stopReleaseExpiredHoldsJob(): void {
  if (interval) clearInterval(interval);
  interval = undefined;
}
