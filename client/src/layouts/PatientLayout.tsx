import { CalendarDays, ClipboardList, Heart, LayoutDashboard, Pill, Receipt, Bot } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Container } from "../components/ui/Container";
import { cn } from "../lib/cn";

const links = [
  { to: "/patient", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/patient/appointments", label: "Appointments", icon: CalendarDays, end: false },
  { to: "/patient/records", label: "Treatment records", icon: ClipboardList, end: false },
  { to: "/patient/prescriptions", label: "Prescriptions", icon: Pill, end: false },
  { to: "/patient/payments", label: "Payments & invoices", icon: Receipt, end: false },
  { to: "/patient/ai-assistant", label: "AI assistant", icon: Bot, end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-deep",
    isActive ? "bg-brand-strong text-white shadow-sm [&_.nav-icon]:bg-white/15" : "text-slate-600 hover:bg-brand-soft hover:text-brand-deep",
  );

/** Side navigation on large screens, a scrollable tab row on small ones. Hidden when printing. */
export function PatientLayout() {
  return (
    <div className="bg-slate-50/60">
      <Container className="grid gap-6 py-8 lg:grid-cols-[240px_1fr] lg:py-10">
        <nav aria-label="Patient dashboard" className="min-w-0 print:hidden">
          <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm lg:sticky lg:top-24">
            <div className="hidden px-3 pb-3 pt-2 lg:block">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-strong">Patient portal</p>
              <p className="mt-1 text-xs text-slate-500">Manage your SmileCare visits</p>
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
              <div className="flex items-center gap-2 font-semibold"><Heart className="h-4 w-4" aria-hidden="true" /> Keep your smile healthy</div>
              <p className="mt-1 text-slate-600">Your records and care notes stay together here.</p>
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
