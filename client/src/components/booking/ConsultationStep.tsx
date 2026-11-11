import { Building2, Video } from "lucide-react";
import type { ConsultationType } from "../../types/api";
import { OptionCard } from "./OptionCard";

type Props = { value: ConsultationType; onChange: (value: ConsultationType) => void };

const options = [
  { value: "IN_CLINIC", icon: Building2, title: "In-clinic visit", text: "Visit our clinic for a personal consultation." },
  { value: "VIDEO", icon: Video, title: "Video consultation", text: "Meet the dentist online on Google Meet from home." },
] as const;

export function ConsultationStep({ value, onChange }: Props) {
  return (
    <fieldset>
      <legend className="sr-only">Consultation type</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(({ value: v, icon: Icon, title, text }) => (
          <OptionCard key={v} name="consultation" value={v} checked={value === v} onChange={() => onChange(v)}>
            <span className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="pr-6">
                <span className="block font-semibold text-brand-deep">{title}</span>
                <span className="mt-1 block text-sm text-slate-600">{text}</span>
              </span>
            </span>
          </OptionCard>
        ))}
      </div>
    </fieldset>
  );
}
