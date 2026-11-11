import { Award, Clock, GraduationCap, MapPin, MessageCircle, Phone, Briefcase, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BookingCta } from "../../components/home/BookingCta";
import { ReviewsSection } from "../../components/reviews/ReviewsSection";
import { ButtonLink } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { clinic, doctor, telHref, whatsappHref } from "../../lib/clinic";
import { formatPaise } from "../../lib/format";
import { clinicImages } from "../../lib/clinicImages";
import { ClinicImage } from "../../components/ui/ClinicImage";

const quick: Array<{ icon: LucideIcon; label: string; value: string; href?: string }> = [
  { icon: Phone, label: "Call now", value: clinic.phone, href: telHref },
  { icon: MessageCircle, label: "WhatsApp", value: "Chat with us", href: whatsappHref },
  { icon: MapPin, label: "Clinic address", value: clinic.address },
  { icon: Clock, label: "Clinic timings", value: "Mon–Sat, 9:00 AM – 7:00 PM" },
  { icon: Wallet, label: "Consultation fee", value: formatPaise(clinic.consultationFeePaise) },
];

export function DoctorPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-soft via-white to-white">
        <Container className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[3fr_2fr]">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow-sm">
              Your dental care expert
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{doctor.name}</h1>
            <p className="mt-2 font-medium text-brand-strong">{doctor.title}</p>
            <p className="mt-4 max-w-xl text-slate-600">{doctor.intro}</p>
            <dl className="mt-6 flex flex-wrap gap-6">
              <div>
                <dt className="text-sm text-slate-500">Patient rating</dt>
                <dd className="text-2xl font-bold text-brand-deep">{clinic.stats.rating}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Experience</dt>
                <dd className="text-2xl font-bold text-brand-deep">{clinic.stats.experience}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Happy patients</dt>
                <dd className="text-2xl font-bold text-brand-deep">{clinic.stats.patients}</dd>
              </div>
            </dl>
            <div className="mt-8">
              <ButtonLink to="/book" size="lg">
                Book appointment
              </ButtonLink>
            </div>
          </div>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl bg-brand-soft shadow-xl">
            <ClinicImage
              src={clinicImages.doctor}
              alt={`${doctor.name}, dentist at SmileCare Clinic`}
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur">
              <p className="font-bold text-brand-deep">{doctor.name}</p>
              <p className="text-xs text-slate-600">{doctor.title}</p>
            </div>
          </div>
        </Container>
      </section>

      <section aria-label="Contact and clinic details" className="border-y border-slate-100 bg-white">
        <Container>
          <ul className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-5">
            {quick.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm">
                  <span className="block font-semibold text-brand-deep">{label}</span>
                  {href ? (
                    <a href={href} className="text-slate-600 hover:underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {value}
                    </a>
                  ) : (
                    <span className="text-slate-600">{value}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">A compassionate dentist dedicated to healthier, happier smiles</h2>
            <p className="mt-4 text-slate-600">
              I believe in listening to my patients, explaining treatment options clearly, and creating personalized care plans that suit your unique needs and goals. Your smile and confidence mean everything to us.
            </p>
          </div>
          <blockquote className="rounded-3xl bg-brand-soft p-8 text-lg italic text-brand-deep">
            “{doctor.quote}”
            <footer className="mt-4 text-sm not-italic font-semibold">{doctor.name}</footer>
          </blockquote>
        </Container>
      </section>

      <section className="bg-brand-soft/60 py-16 sm:py-20">
        <Container>
          <SectionHeading eyebrow="Expertise" title="Treatment specialties" subtitle="Comprehensive dental care with a focus on advanced, minimally invasive and aesthetic treatments." />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {doctor.specialties.map((s) => (
              <li key={s.name} className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-semibold">{s.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <ButtonLink to="/treatments" variant="outline">
              View all treatments
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-3 text-2xl font-bold">
              <GraduationCap className="h-6 w-6 text-brand" aria-hidden="true" /> Education & credentials
            </h2>
            <ol className="mt-6 space-y-5 border-l-2 border-brand-soft pl-6">
              {doctor.education.map((e) => (
                <li key={e.title} className="relative">
                  <span aria-hidden="true" className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-brand" />
                  <p className="font-semibold text-brand-deep">{e.title}</p>
                  {e.place && <p className="text-sm text-slate-600">{e.place}</p>}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="flex items-center gap-3 text-2xl font-bold">
              <Briefcase className="h-6 w-6 text-brand" aria-hidden="true" /> Professional journey
            </h2>
            <ol className="mt-6 space-y-5 border-l-2 border-brand-soft pl-6">
              {doctor.journey.map((j) => (
                <li key={j.years} className="relative">
                  <span aria-hidden="true" className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-brand" />
                  <p className="text-sm font-semibold text-brand-strong">{j.years}</p>
                  <p className="font-semibold text-brand-deep">{j.title}</p>
                  <p className="text-sm text-slate-600">{j.place}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <Award className="h-4 w-4" aria-hidden="true" />
              Profile details are fictional and used for this demo.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Our clinic"
            title="A modern, welcoming space"
            subtitle="A calm and clean environment designed to make your visit feel comfortable."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-[1.3fr_1fr]">
            <div className="aspect-[16/10] overflow-hidden rounded-3xl bg-brand-soft shadow-sm">
              <ClinicImage
                src={clinicImages.clinicTreatmentRoom}
                alt="Dental treatment room at SmileCare Clinic"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="aspect-[16/10] overflow-hidden rounded-3xl bg-brand-soft shadow-sm md:aspect-auto">
              <ClinicImage
                src={clinicImages.clinicReception}
                alt="Reception area at SmileCare Clinic"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </Container>
      </section>

      <ReviewsSection limit={3} />
      <BookingCta />
    </>
  );
}