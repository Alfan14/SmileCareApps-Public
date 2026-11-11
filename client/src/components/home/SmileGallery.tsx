import { Images, ShieldCheck } from "lucide-react";
import { clinicImages } from "../../lib/clinicImages";
import { ClinicImage } from "../ui/ClinicImage";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";

/** Before-and-after area. Only publish genuine patient cases with documented consent. */
export function SmileGallery() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Smile transformations"
          title="Small changes. Brighter smiles."
          subtitle="Explore examples of dental care and smile improvements. Every treatment plan is personal."
        />

        <div className="mt-9 grid gap-5 lg:grid-cols-2">
          {clinicImages.beforeAfter.map((item, index) => (
            <figure key={item.title} className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-brand-soft">
                  <ClinicImage
                    src={item.before}
                    alt={`Before treatment, ${item.title}`}
                    className="h-full w-full object-cover"
                    fallbackLabel="Before photo not added"
                  />
                  <span className="absolute bottom-2 left-2 rounded-full bg-slate-900/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">Before</span>
                </div>
                <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-brand-soft">
                  <ClinicImage
                    src={item.after}
                    alt={`After treatment, ${item.title}`}
                    className="h-full w-full object-cover"
                    fallbackLabel="After photo not added"
                  />
                  <span className="absolute bottom-2 left-2 rounded-full bg-brand-strong/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">After</span>
                </div>
              </div>
              <figcaption className="mt-3 flex items-center justify-between gap-3 px-1">
                <span className="text-sm font-semibold text-brand-deep">{item.title}</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><Images className="h-3.5 w-3.5" aria-hidden="true" /> Case {String(index + 1).padStart(2, "0")}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
          Publish only genuine clinical photographs with patient consent. Keep comparable lighting and angles, and explain that individual results vary.
        </p>
      </Container>
    </section>
  );
}
