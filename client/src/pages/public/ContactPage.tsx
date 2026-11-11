import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "../../components/contact/ContactForm";
import { ClinicImage } from "../../components/ui/ClinicImage";
import { Container } from "../../components/ui/Container";
import { PageHero } from "../../components/ui/PageHero";
import { clinic, mailHref, telHref, whatsappHref } from "../../lib/clinic";
import { clinicImages } from "../../lib/clinicImages";

const cards = [
  { icon: Phone, label: "Call us", value: clinic.phone, href: telHref },
  { icon: MessageCircle, label: "WhatsApp", value: "Chat with us", href: whatsappHref, external: true },
  { icon: Mail, label: "Email", value: clinic.email, href: mailHref },
  { icon: MapPin, label: "Visit us", value: clinic.address },
];

export function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="We are happy to help" text="Ask a question, request a callback, or tell us how we can help. We usually reply within one working day." />

      <section className="py-14 sm:py-16">
        <Container className="grid gap-10 lg:grid-cols-[2fr_3fr]">
          <div className="space-y-4">
            {cards.map(({ icon: Icon, label, value, href, external }) => (
              <div key={label} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-brand/30 hover:shadow-md">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="text-sm">
                  <p className="font-semibold text-brand-deep">{label}</p>
                  {href ? (
                    <a href={href} className="text-slate-600 hover:text-brand-deep hover:underline" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{value}</a>
                  ) : (
                    <p className="text-slate-600">{value}</p>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="text-sm">
                <p className="font-semibold text-brand-deep">Clinic hours</p>
                {clinic.hours.map((h) => <p key={h.days} className="text-slate-600">{h.days}: {h.time}</p>)}
              </div>
            </div>
            <div className="group relative aspect-[16/9] overflow-hidden rounded-3xl bg-brand-soft shadow-sm">
              <ClinicImage
                src={clinicImages.clinicReception}
                alt="Reception area at SmileCare Clinic"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-deep/85 to-transparent p-5 pt-12 text-white">
                <p className="font-semibold">Welcome to SmileCare Clinic</p>
                <p className="mt-1 text-xs text-white/80">We look forward to helping you care for your smile.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold">Send us a message</h2>
            <p className="mb-6 mt-1 text-sm text-slate-600">Fields marked with * are required.</p>
            <ContactForm />
          </div>
        </Container>
      </section>
    </>
  );
}
