import { Armchair, CalendarClock, HeartHandshake, Microscope } from "lucide-react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";

const items = [
  { icon: Microscope, title: "Modern equipment", text: "Advanced technology for accurate and painless treatments." },
  { icon: Armchair, title: "Comfortable clinic", text: "A clean, relaxing and hygienic environment." },
  { icon: HeartHandshake, title: "Personalized care", text: "Tailored treatment plans for your unique needs." },
  { icon: CalendarClock, title: "Flexible appointments", text: "Convenient timings to fit your schedule." },
];

export function WhyChooseUs() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Why choose SmileCare"
          title="A better dental experience"
          subtitle="Modern technology with a gentle approach, to give you the best possible care."
        />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
