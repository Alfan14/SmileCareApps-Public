import { Clock, Mail, MapPin, Phone, Smile } from "lucide-react";
import { Link } from "react-router-dom";
import { clinic, mailHref, telHref } from "../../lib/clinic";
import { Container } from "../ui/Container";

const YEAR = new Date().getFullYear();

const quickLinks = [
  { to: "/", label: "Home" },
  { to: "/treatments", label: "Treatments" },
  { to: "/doctor", label: "Doctor" },
  { to: "/ai-assistant", label: "AI Assistant" },
  { to: "/faqs", label: "FAQs" },
  { to: "/contact", label: "Contact" },
  { to: "/book", label: "Book Appointment" },
];

const heading = "text-sm font-semibold uppercase tracking-wide text-white";

export function Footer() {
  return (
    <footer className="bg-brand-deep text-white/80 print:hidden">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
              <Smile className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold">{clinic.name}</span>
          </div>
          <p className="mt-4 text-sm">{clinic.tagline}. Gentle, personalized dental care from one dedicated dentist.</p>
        </div>

        <div>
          <h2 className={heading}>Quick links</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {quickLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-white hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className={heading}>Contact</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {clinic.address}
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <a href={telHref} className="hover:text-white hover:underline">
                {clinic.phone}
              </a>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <a href={mailHref} className="hover:text-white hover:underline">
                {clinic.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className={heading}>Clinic hours</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {clinic.hours.map((h) => (
              <li key={h.days} className="flex gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {h.days}
                  <br />
                  <span className="text-white">{h.time}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-1 py-5 text-xs sm:flex-row sm:justify-between">
          <p>
            © {YEAR} {clinic.name}. Take-home project: all data is dummy.
          </p>
          <p>Payments run in Stripe test mode. No real money is charged.</p>
        </Container>
      </div>
    </footer>
  );
}
