const compactInr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** "3 Nov" from "2026-11-03" */
export const shortDay = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** "Oct 2026" from "2026-10" */
export const shortMonth = (ym: string) =>
  new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-01T00:00:00Z`));

/** Short money label for chart axes, from paise, in Indian style: 1245000 -> "₹12.5K", 12450000 -> "₹1.2L" */
export const compactRupees = (paise: number) => compactInr.format(paise / 100);
