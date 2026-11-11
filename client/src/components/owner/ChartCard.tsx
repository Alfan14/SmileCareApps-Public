import { useId } from "react";
import type { ReactNode } from "react";

type Props = { title: string; summary: string; table: ReactNode; children: ReactNode };

/** A titled chart with a text summary for screen readers and a "view as table" fallback. */
export function ChartCard({ title, summary, table, children }: Props) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      <div role="img" aria-label={summary} className="mt-4">
        {children}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-brand-deep">View as table</summary>
        <div className="mt-2 max-h-64 overflow-auto">{table}</div>
      </details>
    </section>
  );
}

export function NoChartData({ title }: { title: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No data yet. It will appear here as the clinic gets busy.</p>
    </section>
  );
}
