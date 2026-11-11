import { useState } from "react";
import { AppointmentCard } from "../../components/patient/AppointmentCard";
import { EmptyHint, ListBoundary } from "../../components/patient/ListBoundary";
import { ButtonLink } from "../../components/ui/Button";
import { useNowOnce } from "../../hooks/useNowOnce";
import { useMyAppointments } from "../../hooks/usePatientData";
import { groupAppointments } from "../../lib/appointments";
import type { AppointmentTab } from "../../lib/appointments";
import { cn } from "../../lib/cn";

const tabs: Array<{ id: AppointmentTab; label: string; empty: string }> = [
  { id: "upcoming", label: "Upcoming", empty: "You have no upcoming appointments." },
  { id: "past", label: "Past", empty: "No past visits yet." },
  { id: "cancelled", label: "Cancelled", empty: "No cancelled or expired bookings." },
];

export function PatientAppointmentsPage() {
  const now = useNowOnce();
  const query = useMyAppointments();
  const [tab, setTab] = useState<AppointmentTab>("upcoming");
  const groups = query.data ? groupAppointments(query.data, now) : null;
  const current = tabs.find((t) => t.id === tab) ?? tabs[0]!;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="mt-1 text-slate-600">Your upcoming and past visits with Dr. Aarav Mehta.</p>
        </div>
        <ButtonLink to="/book">Book new appointment</ButtonLink>
      </header>

      <div role="group" aria-label="Filter appointments" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-deep",
              tab === t.id ? "bg-brand-strong text-white" : "bg-brand-soft text-brand-deep hover:bg-brand-soft/70",
            )}
          >
            {t.label}
            {groups && <> <span className="text-xs opacity-80">({groups[t.id].length})</span></>}
          </button>
        ))}
      </div>

      <ListBoundary query={query} skeletons={3} empty={<EmptyHint>{current.empty}</EmptyHint>}>
        {() =>
          groups && groups[tab].length > 0 ? (
            <div className="space-y-3">
              {groups[tab].map((a) => (
                <AppointmentCard key={a.id} appointment={a} now={now} />
              ))}
            </div>
          ) : (
            <EmptyHint>{current.empty}</EmptyHint>
          )
        }
      </ListBoundary>
    </>
  );
}
