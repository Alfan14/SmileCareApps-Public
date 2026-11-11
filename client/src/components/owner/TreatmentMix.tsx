import { useId } from "react";
import type { MixItem } from "../../types/api";

/** Simple bars for "which treatments are booked most". */
export function TreatmentMix({ items }: { items: MixItem[] }) {
  const id = useId();
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 id={id} className="text-lg font-bold">
        Appointments by status
      </h2>
      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((i) => (
            <li key={i.name}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">{i.name}</span>
                <span className="text-slate-500">{i.count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-brand-soft" aria-hidden="true">
                <div className="h-full rounded-full bg-brand-strong" style={{ width: `${Math.round((i.count / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
