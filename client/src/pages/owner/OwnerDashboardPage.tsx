import { CalendarDays, Clock3, IndianRupee, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { AppointmentsChart } from "../../components/owner/AppointmentsChart";
import { RevenueChart } from "../../components/owner/RevenueChart";
import { ScheduleList } from "../../components/owner/ScheduleList";
import { StatCard } from "../../components/owner/StatCard";
import { TreatmentMix } from "../../components/owner/TreatmentMix";
import { EmptyHint, ListBoundary } from "../../components/patient/ListBoundary";
import { SectionCard } from "../../components/patient/SectionCard";
import { ButtonLink } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorState } from "../../components/ui/StateMessage";
import { useOwnerAppointments, useOwnerStats } from "../../hooks/useOwnerData";
import { useCurrentUser } from "../../hooks/useAuth";
import { useNowOnce } from "../../hooks/useNowOnce";
import { todayInClinic } from "../../lib/dates";
import { formatPaise } from "../../lib/format";
import { clinicImages } from "../../lib/clinicImages";
import { ClinicImage } from "../../components/ui/ClinicImage";

const money = (paise: number | null) => (paise === null ? "–" : formatPaise(paise));
const count = (n: number | null) => (n === null ? "–" : n.toLocaleString("en-IN"));

/** The clinic control centre: numbers, trends and today's schedule. */
export function OwnerDashboardPage() {
  const { user } = useCurrentUser();
  const now = useNowOnce();
  const [today] = useState(() => todayInClinic());
  const stats = useOwnerStats();
  const schedule = useOwnerAppointments(today);
  const summary = stats.data?.summary;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-brand-soft shadow-sm">
            <ClinicImage
              src={clinicImages.doctor}
              alt="SmileCare dentist profile"
              className="h-full w-full object-cover object-top"
            />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-strong">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Clinic dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {user?.name}</h1>
            <p className="mt-1 text-sm text-slate-600">Here is what is happening at SmileCare Clinic today.</p>
          </div>
        </div>
        <ButtonLink to="/owner/records" variant="outline">
          Add a record
        </ButtonLink>
      </header>

      {stats.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}
      {stats.isError && <ErrorState message="We could not load the clinic numbers." onRetry={() => void stats.refetch()} />}

      {stats.data && summary && (
      <>
        <section
          aria-label="Key numbers"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <StatCard
            icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
            label="Appointments today"
            value={count(summary.appointmentsToday)}
          />

          <StatCard
            icon={<Users className="h-5 w-5" aria-hidden="true" />}
            label="Total patients"
            value={count(summary.totalPatients)}
          />

          <StatCard
            icon={<IndianRupee className="h-5 w-5" aria-hidden="true" />}
            label="Revenue this month"
            value={money(summary.revenuePaiseThisMonth)}
          />

          <StatCard
            icon={<Clock3 className="h-5 w-5" aria-hidden="true" />}
            label="Pending appointments"
            value={count(summary.pendingAppointments)}
          />

          <StatCard
            icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
            label="Completed this month"
            value={count(summary.completedThisMonth)}
          />

          <StatCard
            icon={<IndianRupee className="h-5 w-5" aria-hidden="true" />}
            label="Paid transactions"
            value={count(summary.paidTransactionsThisMonth)}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <AppointmentsChart data={stats.data.bookingsByDay} />
          <RevenueChart data={stats.data.revenueByDay} />
        </div>

        <TreatmentMix items={stats.data.appointmentsByStatus} />
      </>
    )}

      <SectionCard title="Today’s schedule" viewAllTo="/owner/appointments">
        <ListBoundary query={schedule} skeletons={3} empty={<EmptyHint>No appointments today.</EmptyHint>}>
          {(items) => <ScheduleList appointments={items} now={now} />}
        </ListBoundary>
      </SectionCard>
    </>
  );
}