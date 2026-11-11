import { HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import { BookingCta } from "../../components/home/BookingCta";
import { WhyChooseUs } from "../../components/home/WhyChooseUs";
import { FaqSection } from "../../components/faq/FaqSection";
import { TreatmentGrid } from "../../components/treatments/TreatmentGrid";
import { ClinicImage } from "../../components/ui/ClinicImage";
import { Container } from "../../components/ui/Container";
import { PageHero } from "../../components/ui/PageHero";
import { clinicImages } from "../../lib/clinicImages";

const badges = [
  { icon: ShieldCheck, label: "Safe & modern care" },
  { icon: Sparkles, label: "Comfortable experience" },
  { icon: HeartPulse, label: "Personalized plans" },
];

export function TreatmentsPage() {
  return (
    <>
      <PageHero
        eyebrow="Our treatments"
        title={<>Dental treatments for <span className="text-brand-strong">every smile</span></>}
        text="From preventive care to advanced treatments, we provide gentle, effective and personalized dental care, all under one roof."
      >
        {badges.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-brand-deep shadow-sm">
            <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
            {label}
          </span>
        ))}
      </PageHero>

      <section className="pb-10 pt-8 sm:pb-12">
        <Container>
          <div className="relative isolate min-h-56 overflow-hidden rounded-3xl bg-brand-deep shadow-lg sm:min-h-64">
            <ClinicImage
              src={clinicImages.clinicTreatmentRoom}
              alt="Bright, modern dental treatment room at SmileCare Clinic"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-brand-deep/90 via-brand-deep/55 to-transparent" />
            <div className="relative flex min-h-56 max-w-xl flex-col justify-center p-6 text-white sm:min-h-64 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Care made personal</p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">A comfortable space for every smile.</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">Explore our services and choose the care that is right for your needs.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-10 sm:py-14">
        <Container>
          <p className="mb-8 text-center text-sm text-slate-500">Prices are indicative. The final cost is confirmed after your examination.</p>
          <TreatmentGrid />
        </Container>
      </section>

      <WhyChooseUs />
      <FaqSection limit={6} />
      <BookingCta />
    </>
  );
}
