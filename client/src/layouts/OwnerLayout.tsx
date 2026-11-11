import { Bot, CalendarDays, ClipboardPlus, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Container } from "../components/ui/Container";
import { cn } from "../lib/cn";

const links = [
  { to: "/owner", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/owner/appointments", label: "Schedule", icon: CalendarDays, end: false },
  { to: "/owner/patients", label: "Patients", icon: Users, end: false },
  { to: "/owner/records", label: "Add records", icon: ClipboardPlus, end: false },
  { to: "/owner/settings", label: "Hours & days off", icon: Settings, end: false },
  { to: "/owner/ai-settings", label: "AI assistant", icon: Bot, end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-deep",
    isActive ? "bg-brand-strong text-white shadow-sm [&_.nav-icon]:bg-white/15" : "text-slate-600 hover:bg-brand-soft hover:text-brand-deep",
  );

/** Same pattern as the patient area: side navigation on large screens, scrollable tabs on small ones. */
export function OwnerLayout() {
  return (
    <div className="bg-slate-50/60">
      <Container className="grid gap-6 py-8 lg:grid-cols-[240px_1fr] lg:py-10">
        <nav aria-label="Clinic dashboard" className="min-w-0 print:hidden">
          <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm lg:sticky lg:top-24">
            <div className="hidden px-3 pb-3 pt-2 lg:block">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-strong">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Clinic workspace
              </p>
              <p className="mt-1 text-xs text-slate-500">Manage your single-doctor clinic</p>
            </div>
            <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {links.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink to={to} end={end} className={linkClass}>
                    <span className="nav-icon grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-black/5">
                      <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <span className="whitespace-nowrap">{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-2 hidden rounded-xl bg-brand-soft/70 p-3 text-xs text-brand-deep lg:block">
              <p className="font-semibold">Clinic control center</p>
              <p className="mt-1 text-slate-600">Appointments, patient records and settings in one place.</p>
            </div>
          </div>
        </nav>
        <div className="min-w-0 space-y-6">
          <Outlet />
        </div>
      </Container>
    </div>
  );
}
