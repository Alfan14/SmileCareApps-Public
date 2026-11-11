import { CheckCircle2 } from "lucide-react";
import { clinic, doctor } from "../../lib/clinic";
import { clinicImages } from "../../lib/clinicImages";
import { ClinicImage } from "../ui/ClinicImage";

/** The clinic has one dentist, so this card confirms who the patient will see. */
export function DentistStep() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-brand-strong bg-brand-soft/60 p-4 ring-1 ring-brand-strong">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-2 ring-white">
        <ClinicImage
          src={clinicImages.doctor}
          alt={`${doctor.name}, selected dentist`}
          className="h-full w-full object-cover object-top"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-brand-deep">{doctor.name}</p>
        <p className="text-sm text-slate-600">{doctor.title}</p>
        <p className="mt-1 text-xs text-slate-500">
          {clinic.stats.experience} experience · {clinic.stats.rating} rating
        </p>
      </div>
      <CheckCircle2 className="h-6 w-6 shrink-0 text-brand-strong" aria-label="Selected dentist" />
    </div>
  );
}
