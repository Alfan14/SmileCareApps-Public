import { Baby, Gem, HeartPulse, ShieldCheck, Sparkles, Stethoscope, Sun, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "general-consultation": Stethoscope,
  "teeth-cleaning": Sparkles,
  "teeth-whitening": Sun,
  "root-canal": HeartPulse,
  "dental-implants": Wrench,
  veneers: Gem,
  "pediatric-dentistry": Baby,
  "gum-treatment": ShieldCheck,
};

/** Small secondary symbol used over each treatment photograph. */
export function TreatmentIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = icons[slug] ?? Stethoscope;
  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}
