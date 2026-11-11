import { Star } from "lucide-react";
import { cn } from "../../lib/cn";

export function StarRating({ value }: { value: number }) {
  return (
    <div role="img" aria-label={`${value} out of 5 stars`} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden="true" className={cn("h-4 w-4", n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
      ))}
    </div>
  );
}
