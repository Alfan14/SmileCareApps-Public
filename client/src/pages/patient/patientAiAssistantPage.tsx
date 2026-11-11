import { Bot, CalendarCheck, Droplets, HeartPulse, Receipt } from "lucide-react";
import { ChatPanel } from "../../components/ai/ChatPanel";
import { ButtonLink } from "../../components/ui/Button";
import { ClinicImage } from "../../components/ui/ClinicImage";
import { clinicImages } from "../../lib/clinicImages";

const topics = [
  { icon: HeartPulse, title: "Oral health", text: "Dental hygiene and tooth sensitivity." },
  { icon: CalendarCheck, title: "Appointments", text: "Booking and preparing for visits." },
  { icon: Droplets, title: "Aftercare", text: "General post-treatment guidance." },
  { icon: Receipt, title: "Treatment costs", text: "General information about fees." },
];

export function PatientAiAssistantPage() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-brand-strong">PATIENT SUPPORT</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">AI Dental Assistant</h1>
        <p className="mt-2 text-slate-600">Ask questions about oral health, treatments, appointment preparation and dental aftercare.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ChatPanel />

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-brand/10 bg-gradient-to-br from-brand-soft to-white p-5">
            <div className="mx-auto h-32 w-32 overflow-hidden rounded-2xl bg-white shadow-sm">
              <ClinicImage src={clinicImages.aiAssistant} alt="SmileCare AI dental assistant mascot" className="h-full w-full object-contain p-1" />
            </div>
            <div className="mt-3 text-center">
              <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-strong"><Bot className="h-4 w-4" aria-hidden="true" /> SmileCare AI</p>
              <h2 className="mt-1 font-bold text-brand-deep">Here to help with your smile</h2>
              <p className="mt-1 text-xs text-slate-600">Get simple guidance for everyday dental questions.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5">
            <h2 className="font-bold text-brand-deep">What can you ask?</h2>
            <div className="mt-4 space-y-4">
              {topics.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                  <div>
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="text-xs text-slate-500">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-brand-soft p-5">
            <h2 className="font-bold text-brand-deep">Need professional care?</h2>
            <p className="mt-2 text-sm text-slate-700">AI cannot replace a dentist's diagnosis or personalized treatment plan.</p>
            <div className="mt-4"><ButtonLink to="/book">Book an appointment</ButtonLink></div>
          </section>
        </aside>
      </div>
    </section>
  );
}
