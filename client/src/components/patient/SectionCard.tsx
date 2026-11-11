import { useId } from "react";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type Props = { title: string; viewAllTo?: string; children: ReactNode };

export function SectionCard({ title, viewAllTo, children }: Props) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 print:shadow-none">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-lg font-bold">
          {title}
        </h2>
        {viewAllTo && (
          <Link to={viewAllTo} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-brand-deep">
            View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
