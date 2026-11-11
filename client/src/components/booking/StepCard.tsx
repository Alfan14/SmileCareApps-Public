import type { ReactNode } from "react";

type Props = { number: number; title: string; subtitle: string; children: ReactNode };

export function StepCard({ number, title, subtitle, children }: Props) {
  const id = `booking-step-${number}`;
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-strong text-sm font-bold text-white">
          {number}
        </span>
        <div>
          <h2 id={id} className="text-lg font-bold">
            {title}
          </h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
