import { Droplets, Smile, Stethoscope } from "lucide-react";

const tips = [
  { icon: Smile, title: "Brush twice a day", text: "Use a soft-bristled toothbrush and fluoride toothpaste for 2 minutes." },
  { icon: Droplets, title: "Do not skip flossing", text: "Floss daily to keep your gums healthy and prevent cavities." },
  { icon: Stethoscope, title: "Regular check-ups", text: "Visit every 6 months for a cleaning and early detection of dental issues." },
];

/** General tips for everyone. Not personal medical advice. */
export function CareTips() {
  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {tips.map(({ icon: Icon, title, text }) => (
        <li key={title} className="rounded-2xl bg-brand-soft/60 p-4">
          <Icon className="h-6 w-6 text-brand-strong" aria-hidden="true" />
          <h3 className="mt-2 font-semibold text-brand-deep">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{text}</p>
        </li>
      ))}
    </ul>
  );
}
