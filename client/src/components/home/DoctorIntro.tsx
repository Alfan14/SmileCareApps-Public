import { HeartPulse, ShieldCheck, Sparkles, Star } from "lucide-react";
import { clinic, doctor } from "../../lib/clinic";
import { clinicImages } from "../../lib/clinicImages";
import { ButtonLink } from "../ui/Button";
import { ClinicImage } from "../ui/ClinicImage";
import { Container } from "../ui/Container";

const highlights = [
  { icon: HeartPulse, label: "Patient-centered approach" },
  { icon: Sparkles, label: "Modern dental technology" },
  { icon: ShieldCheck, label: "Gentle and thoughtful care" },
];

export function DoctorIntro() {
  return (
    <section className="bg-brand-soft/60 py-16 sm:py-20">
      <Container className="grid items-center gap-10 lg:grid-cols-[2fr_3fr]">
        <div className="relative mx-auto w-full max-w-sm">
          <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-brand-deep/5">
            <ClinicImage
              src={clinicImages.doctor}
              alt={`${doctor.name}, dentist at SmileCare Clinic`}
              className="h-full w-full object-cover object-center"
            />
          </div>
          <div className="absolute -bottom-4 -right-4 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-100">
            <p className="text-xl font-bold text-brand-deep">{clinic.stats.experience}</p>
            <p className="text-xs text-slate-500">Clinical experience</p>
          </div>
          <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-brand-deep shadow-md">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            {clinic.stats.rating} patient rating
          </div>
        </div>

        <div>
          <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-deep">Meet your dentist</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{doctor.name}</h2>
          <p className="mt-1 font-medium text-brand-strong">{doctor.title}</p>
          <p className="mt-4 leading-relaxed text-slate-600">{doctor.intro}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {highlights.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-medium text-brand-deep shadow-sm">
                <Icon className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <blockquote className="mt-6 rounded-2xl border-l-4 border-brand bg-white p-5 text-sm italic leading-relaxed text-slate-600">
            “{doctor.quote}”
          </blockquote>
          <div className="mt-6">
            <ButtonLink to="/doctor">Learn more about Dr. Mehta</ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
