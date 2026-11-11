import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { clinic, mailHref, telHref, whatsappHref } from "../../lib/clinic";
import { ButtonAnchor, ButtonLink } from "../ui/Button";
import { Container } from "../ui/Container";

export function BookingCta() {
  return (
    <section className="py-16 sm:py-20">
      <Container className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col justify-center rounded-3xl bg-gradient-to-br from-brand-strong to-brand-deep p-8 text-white sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Let’s connect</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Book your visit today</h2>
          <p className="mt-3 text-white/85">Take the first step towards a healthier, brighter smile. We are here to make your dental care journey simple and stress-free.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink to="/book" variant="light" size="lg">
              Book appointment
            </ButtonLink>
            <ButtonAnchor href={whatsappHref} target="_blank" rel="noopener noreferrer" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Chat on WhatsApp
            </ButtonAnchor>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm sm:p-10">
          <h2 className="text-xl font-bold">Our clinic</h2>
          <ul className="mt-5 space-y-4 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <span>
                <span className="block font-semibold text-brand-deep">{clinic.name}</span>
                {clinic.address}
              </span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <a href={telHref} className="hover:underline">
                {clinic.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <a href={mailHref} className="hover:underline">
                {clinic.email}
              </a>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <span>
                {clinic.hours.map((h) => (
                  <span key={h.days} className="block">
                    {h.days}: <span className="font-medium text-slate-800">{h.time}</span>
                  </span>
                ))}
              </span>
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}
