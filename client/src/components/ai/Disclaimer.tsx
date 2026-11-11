import { Info } from "lucide-react";

/** Must stay visible next to the chat: the assistant gives general information and does not replace the dentist. */
export function Disclaimer() {
  return (
    <p className="flex items-start gap-2 text-xs text-slate-600">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
      <span>
        <strong>General information only.</strong> This assistant does not replace advice from your dentist and cannot diagnose. For severe pain, swelling, bleeding or an
        emergency, contact the clinic or local emergency services straight away.
      </span>
    </p>
  );
}
