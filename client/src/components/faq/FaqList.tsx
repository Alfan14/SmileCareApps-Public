import { ChevronDown } from "lucide-react";
import type { Faq } from "../../types/api";

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm">
      {faqs.map((f) => (
        <details key={f.id} className="group p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-deep [&::-webkit-details-marker]:hidden">
            {f.question}
            <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
