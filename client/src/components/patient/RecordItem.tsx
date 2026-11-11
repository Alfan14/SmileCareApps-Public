import { ClipboardList, Download } from "lucide-react";
import { recordPdfUrl } from "../../api/patient.api";
import { cn } from "../../lib/cn";
import { dateOrDash } from "../../lib/display";
import type { MyRecord } from "../../types/api";

export function RecordItem({ record, compact = false }: { record: MyRecord; compact?: boolean }) {
  return (
    <article className="flex gap-3 rounded-2xl border border-slate-100 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep">
        <ClipboardList className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="font-semibold text-brand-deep">{record.title}</h3>
          <p className="text-xs text-slate-500">{dateOrDash(record.date)}</p>
        </div>
        {record.toothNo && <p className="text-xs text-slate-500">Tooth {record.toothNo}</p>}
        {record.summary && <p className={cn("mt-1 text-sm text-slate-600", compact && "line-clamp-2")}>{record.summary}</p>}
        {!compact && (
          <a
            href={recordPdfUrl(record.id)}
            download
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-brand-deep"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Download PDF report
          </a>
        )}
      </div>
    </article>
  );
}
