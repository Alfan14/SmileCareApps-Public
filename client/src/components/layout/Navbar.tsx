import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bot, CalendarPlus, CircleHelp, House, LayoutDashboard, LogIn, LogOut, Mail, Menu, Smile, Stethoscope, UserRound, X } from "lucide-react";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import { cn } from "../../lib/cn";
import { homeFor } from "../../lib/roles";
import { Button, ButtonLink } from "../ui/Button";
import { Container } from "../ui/Container";

const links = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/treatments", label: "Treatments", icon: Stethoscope, end: false },
  { to: "/doctor", label: "Doctor", icon: UserRound, end: false },
  { to: "/ai-assistant", label: "AI assistant", icon: Bot, end: false },
  { to: "/faqs", label: "FAQs", icon: CircleHelp, end: false },
  { to: "/contact", label: "Contact", icon: Mail, end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-deep",
    isActive ? "bg-brand-soft text-brand-deep" : "text-slate-600 hover:text-brand-deep",
  );

export function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const navigate = useNavigate();
  const { user, isLoading } = useCurrentUser();
  const logout = useLogout();

  function onLogout() {
    close();
    logout.mutate(undefined, { onSettled: () => void navigate("/") });
  }

  const showBook = !user || user.role === "PATIENT";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur print:hidden">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to="/" onClick={close} className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-brand-deep">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-strong text-white">
            <Smile className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold text-brand-deep">
            SmileCare <span className="font-normal text-slate-500">Clinic</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map(({ icon: Icon, ...link }) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            {!isLoading && user && (
              <>
                <ButtonLink to={homeFor(user.role)} variant="ghost">
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Dashboard
                </ButtonLink>
                <Button variant="outline" onClick={onLogout} disabled={logout.isPending}>
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
                </Button>
              </>
            )}
            {!isLoading && !user && (
              <ButtonLink to="/login" variant="ghost">
                <LogIn className="h-4 w-4" aria-hidden="true" /> Log in
              </ButtonLink>
            )}
            {showBook && <ButtonLink to="/book"><CalendarPlus className="h-4 w-4" aria-hidden="true" /> Book Appointment</ButtonLink>}
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full text-brand-deep hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand-deep lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </Container>

      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-slate-100 bg-white lg:hidden">
          <Container className="flex flex-col gap-1 py-3">
            {links.map(({ icon: Icon, ...link }) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass} onClick={close}>
                <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                {link.label}
              </NavLink>
            ))}
            {!isLoading && user && (
              <>
                <ButtonLink to={homeFor(user.role)} variant="ghost" className="mt-2" onClick={close}>
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Dashboard
                </ButtonLink>
                <Button variant="outline" onClick={onLogout} disabled={logout.isPending}>
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
                </Button>
              </>
            )}
            {!isLoading && !user && (
              <ButtonLink to="/login" variant="ghost" className="mt-2" onClick={close}>
                <LogIn className="h-4 w-4" aria-hidden="true" /> Log in
              </ButtonLink>
            )}
            {showBook && (
              <ButtonLink to="/book" className="mt-1" onClick={close}>
                <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Book Appointment
              </ButtonLink>
            )}
          </Container>
        </nav>
      )}
    </header>
  );
}