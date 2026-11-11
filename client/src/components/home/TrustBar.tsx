import { MapPin, ShieldCheck, Star, Users } from "lucide-react";
import { clinic } from "../../lib/clinic";
import { Container } from "../ui/Container";

const items = [
  { icon: Users, value: clinic.stats.patients, label: "Happy patients" },
  { icon: Star, value: clinic.stats.rating, label: "Patient rating" },
  { icon: ShieldCheck, value: "Safe & hygienic", label: "Strict standards" },
  { icon: MapPin, value: "Convenient", label: "Central location" },
];

export function TrustBar() {
  return (
    <section aria-label="Clinic highlights" className="border-y border-slate-100 bg-white">
      <Container>
        <ul className="grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {items.map(({ icon: Icon, value, label }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold text-brand-deep">{value}</span>
                <span className="text-sm text-slate-500">{label}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
