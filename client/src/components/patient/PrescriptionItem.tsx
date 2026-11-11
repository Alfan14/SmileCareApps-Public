import { Pill } from "lucide-react";
import { cn } from "../../lib/cn";
import { dateOrDash } from "../../lib/display";
import type { MyPrescription } from "../../types/api";

export function PrescriptionItem({ prescription, compact = false }: { prescription: MyPrescription; compact?: boolean }) {
  return (
    <article className="flex gap-3 rounded-2xl border border-slate-100 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep">
        <Pill className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="font-semibold text-brand-deep">{prescription.medicine}</h3>
          <p className="text-xs text-slate-500">{dateOrDash(prescription.date)}</p>
        </div>
        {prescription.recordTitle && <p className="text-xs text-slate-500">After: {prescription.recordTitle}</p>}
        {prescription.instructions && <p className={cn("mt-1 text-sm text-slate-600", compact && "line-clamp-2")}>{prescription.instructions}</p>}
      </div>
    </article>
  );
}
