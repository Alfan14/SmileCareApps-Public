import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

type Props = { name: string; value: string; checked: boolean; onChange: () => void; children: ReactNode };

/** A selectable card that is a real radio button underneath, so keyboard and screen readers work. */
export function OptionCard({ name, value, checked, onChange, children }: Props) {
  return (
    <label
      className={cn(
        "relative block h-full cursor-pointer rounded-2xl border bg-white p-4 transition-colors",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-deep",
        checked ? "border-brand-strong bg-brand-soft/60 ring-1 ring-brand-strong" : "border-slate-200 hover:border-brand",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
      {checked && (
        <span aria-hidden="true" className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-brand-strong text-white">
          <Check className="h-3 w-3" />
        </span>
      )}
    </label>
  );
}
