import { CheckCircle2, Info, Sparkles } from "lucide-react";
import { clinicImages } from "../../lib/clinicImages";
import { ButtonLink } from "../ui/Button";
import { ClinicImage } from "../ui/ClinicImage";
import { Container } from "../ui/Container";

const bullets = ["Ask about oral health", "Learn about treatments", "Get general aftercare tips"];

export function AiTeaser() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="grid items-center gap-7 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-soft via-white to-white p-6 sm:p-10 lg:grid-cols-[180px_1fr_auto]">
          <div className="mx-auto h-36 w-36 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-brand/10 sm:h-40 sm:w-40">
            <ClinicImage
              src={clinicImages.aiAssistant}
              alt="SmileCare AI dental assistant mascot"
              className="h-full w-full object-contain p-2"
            />
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-strong">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Meet your AI assistant
            </p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Have a dental question?</h2>
            <p className="mt-2 max-w-2xl text-slate-600">Get quick, helpful guidance about oral health, treatments, appointments and everyday dental care.</p>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
              {bullets.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-strong" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              The assistant gives general information only. It does not replace advice from your dentist.
            </p>
          </div>
          <ButtonLink to="/ai-assistant" size="lg" className="w-full sm:w-auto">Try the AI assistant</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
