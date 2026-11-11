import { Loader2 } from "lucide-react";

export function PageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-[40vh] place-items-center">
      <span className="flex items-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}
