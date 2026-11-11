import { useState } from "react";
import type { ComponentPropsWithRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/cn";
import { inputClass } from "../../lib/formStyles";

/** Password field with a show/hide toggle. Works with react-hook-form's register(). */
export function PasswordInput({ className, ...props }: Omit<ComponentPropsWithRef<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={cn(inputClass, "pr-11", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-deep"
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
