import { Bot, CalendarCheck, Droplets, HeartPulse, Receipt, Sparkles, Stethoscope, Building2 } from "lucide-react";
import { ChatPanel } from "../../components/ai/ChatPanel";
import { BookingCta } from "../../components/home/BookingCta";
import { ButtonLink } from "../../components/ui/Button";
import { ClinicImage } from "../../components/ui/ClinicImage";
import { Container } from "../../components/ui/Container";
import { PageHero } from "../../components/ui/PageHero";
import { clinicImages } from "../../lib/clinicImages";

const topics = [
  { icon: HeartPulse, title: "Oral health", text: "Brushing, gums, sensitivity and everyday care." },
  { icon: Stethoscope, title: "Treatments", text: "What a treatment involves and how long it takes." },
  { icon: CalendarCheck, title: "Appointment prep", text: "How to prepare for your visit." },
  { icon: Droplets, title: "Aftercare", text: "Looking after your smile after treatment." },
  { icon: Receipt, title: "Costs", text: "General information about fees and payments." },
  { icon: Building2, title: "The clinic", text: "Opening hours, location and contact details." },
];

export function AiAssistantPage() {
  return (
    <>
      <PageHero
        eyebrow="AI dental assistant"
        title={<>Your questions. <span className="text-brand-strong">Healthier smiles.</span></>}
        text="Get quick, friendly answers about oral health, treatments, appointment preparation and our clinic, any time of day."
      />

      <section className="py-10 sm:py-14">
        <Container className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
          <ChatPanel />

          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-brand/10 bg-gradient-to-br from-brand-soft to-white p-5" aria-label="Meet the SmileCare assistant">
              <div className="flex items-center gap-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm">
                  <ClinicImage
                    src={clinicImages.aiAssistant}
                    alt="SmileCare AI dental assistant mascot"
                    className="h-full w-full object-contain p-1"
                  />
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-strong"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> SmileCare AI</p>
                  <h2 className="mt-1 text-lg font-bold text-brand-deep">A little help for your smile</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">Friendly answers to common dental questions, whenever you need them.</p>
                </div>
              </div>
            </section>

            <section aria-labelledby="ai-topics">
              <h2 id="ai-topics" className="text-lg font-bold">What you can ask about</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {topics.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-brand/30 hover:shadow-md">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-2 font-semibold text-brand-deep">{title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{text}</p>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="rounded-3xl bg-brand-soft p-5">
              <div className="flex items-center gap-2 text-brand-deep"><Bot className="h-5 w-5" aria-hidden="true" /><h2 className="font-bold">Need personal advice?</h2></div>
              <p className="mt-2 text-sm text-slate-700">The assistant shares general information only. For a diagnosis or a treatment plan, book a visit with Dr. Aarav Mehta.</p>
              <div className="mt-4"><ButtonLink to="/book">Book an appointment</ButtonLink></div>
            </aside>
          </div>
        </Container>
      </section>

      <BookingCta />
    </>
  );
}
