import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import { useTreatments } from "../../hooks/useContent";
import { todayLocalIso } from "../../lib/format";
import { clinicImages } from "../../lib/clinicImages";
import { Button, ButtonLink } from "../ui/Button";
import { ClinicImage } from "../ui/ClinicImage";
import { Container } from "../ui/Container";

const TODAY = todayLocalIso();

const perks = [
  { icon: Sparkles, label: "Modern technology" },
  { icon: HeartPulse, label: "Personalized care" },
  { icon: ShieldCheck, label: "Comfortable experience" },
];

const fieldClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand/20";

export function Hero() {
  const navigate = useNavigate();
  const { data, isPending } = useTreatments();
  const [treatment, setTreatment] = useState("");
  const [date, setDate] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (treatment) params.set("treatment", treatment);
    if (date) params.set("date", date);
    const qs = params.toString();
    void navigate(qs ? `/book?${qs}` : "/book");
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-soft via-white to-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
      <Container className="relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:py-20">
        <div className="relative z-10">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow-sm">
            <span className="h-2 w-2 rounded-full bg-brand-strong" />
            Your smile, our priority
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Healthy Smiles for a <span className="text-brand-strong">Brighter You</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Gentle, personalized and modern dental care by Dr. Aarav Mehta. Because your smile deserves the best.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {perks.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 rounded-full border border-white bg-white/90 px-3 py-2 text-xs font-medium text-brand-deep shadow-sm sm:text-sm">
                <Icon className="h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/book" size="lg">
              Book Appointment <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink to="/treatments" variant="outline" size="lg">
              View Treatments
            </ButtonLink>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-brand-strong" aria-hidden="true" />
            One dedicated dentist. Personal care at every visit.
          </p>
        </div>

        <div className="relative min-h-[560px] overflow-hidden rounded-[2rem] bg-brand-soft shadow-xl sm:min-h-[600px]">
          <ClinicImage
            src={clinicImages.hero}
            alt="A dentist providing a friendly consultation to a patient in a bright dental clinic"
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-brand-deep/55 via-transparent to-brand-deep/5" />
          <div className="absolute left-5 top-5 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-lg backdrop-blur sm:left-7 sm:top-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">SmileCare Clinic</p>
            <p className="mt-0.5 text-sm font-bold text-brand-deep">Gentle care, confident smiles</p>
          </div>

          <form onSubmit={onSubmit} className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-2xl backdrop-blur sm:bottom-6 sm:left-6 sm:right-6 sm:p-5" aria-labelledby="quick-book-title">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="quick-book-title" className="font-bold text-brand-deep">Book your appointment</h2>
                <p className="text-xs text-slate-500">Choose a treatment and preferred date</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="qb-treatment" className="text-xs font-semibold text-slate-700">Treatment</label>
                <select id="qb-treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} className={fieldClass} disabled={isPending}>
                  <option value="">{isPending ? "Loading treatments…" : "Select a treatment"}</option>
                  {data?.map((t) => (
                    <option key={t.id} value={t.slug}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="qb-date" className="text-xs font-semibold text-slate-700">Preferred date</label>
                <input id="qb-date" type="date" min={TODAY} value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
              </div>
              <div className="flex items-end">
                <Button type="submit" size="lg" className="w-full">
                  Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-500">You will select an available time and confirm your details in the next steps.</p>
          </form>
        </div>
      </Container>
    </section>
  );
}
