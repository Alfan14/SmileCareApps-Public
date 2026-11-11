import { Clock, Tag } from "lucide-react";
import { formatDuration, formatPriceRange } from "../../lib/format";
import { treatmentImageFor } from "../../lib/clinicImages";
import type { Treatment } from "../../types/api";
import { ButtonLink } from "../ui/Button";
import { ClinicImage } from "../ui/ClinicImage";
import { TreatmentIcon } from "./TreatmentIcon";

export function TreatmentCard({ treatment }: { treatment: Treatment }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-brand-soft">
        <ClinicImage
          src={treatmentImageFor(treatment.slug)}
          alt={`${treatment.name} dental treatment`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl border border-white/70 bg-white/95 text-brand-deep shadow-md">
          <TreatmentIcon slug={treatment.slug} className="h-5 w-5" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-lg font-semibold">{treatment.name}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{treatment.description}</p>
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand" aria-hidden="true" />
            <dt className="sr-only">Duration</dt>
            <dd>{formatDuration(treatment.durationMin)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-brand" aria-hidden="true" />
            <dt className="sr-only">Price range</dt>
            <dd className="font-medium text-brand-deep">{formatPriceRange(treatment.priceMin, treatment.priceMax)}</dd>
          </div>
        </dl>
        <div className="mt-5 flex gap-2">
          <ButtonLink to={`/treatments/${treatment.slug}`} variant="outline" className="flex-1">Learn more</ButtonLink>
          <ButtonLink to={`/book?treatment=${treatment.slug}`} className="flex-1">Book</ButtonLink>
        </div>
      </div>
    </article>
  );
}
