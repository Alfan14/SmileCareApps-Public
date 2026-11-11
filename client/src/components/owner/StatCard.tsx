import type { ReactNode } from "react";

export function StatCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand-deep">{icon}</span>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-brand-deep">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
