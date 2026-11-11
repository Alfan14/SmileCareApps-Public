const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Amounts are stored in paise (₹500 = 50000). Format only in the UI. */
export const formatPaise = (paise: number) => inr.format(paise / 100);

export const formatPriceRange = (minPaise: number, maxPaise: number) =>
  minPaise === maxPaise ? formatPaise(minPaise) : `${formatPaise(minPaise)} – ${formatPaise(maxPaise)}`;

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Today's date as YYYY-MM-DD in the user's local time zone (for <input type="date" min>). */
export function todayLocalIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export const formatReviewDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(iso));
