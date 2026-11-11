import { AppointmentCard } from "../../components/patient/AppointmentCard";
import { CareTips } from "../../components/patient/CareTips";
import { InvoiceTable } from "../../components/patient/InvoiceTable";
import { EmptyHint, ListBoundary } from "../../components/patient/ListBoundary";
import { PrescriptionItem } from "../../components/patient/PrescriptionItem";
import { QuickActions } from "../../components/patient/QuickActions";
import { RecordItem } from "../../components/patient/RecordItem";
import { SectionCard } from "../../components/patient/SectionCard";
import { ButtonLink } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorState } from "../../components/ui/StateMessage";
import { useCurrentUser } from "../../hooks/useAuth";
import { useNowOnce } from "../../hooks/useNowOnce";
import { useMyAppointments, useMyInvoices, useMyPrescriptions, useMyRecords } from "../../hooks/usePatientData";
import { groupAppointments, isAwaitingPayment, nextAppointment } from "../../lib/appointments";
import { clinicImages } from "../../lib/clinicImages";
import { ClinicImage } from "../../components/ui/ClinicImage";

/** Overview: next visit, shortcuts, and the latest of each kind of record. */
export function PatientDashboardPage() {
  const { user } = useCurrentUser();
  const now = useNowOnce();
  const appointments = useMyAppointments();
  const records = useMyRecords();
  const prescriptions = useMyPrescriptions();
  const invoices = useMyInvoices();

  const next = appointments.data ? nextAppointment(appointments.data, now) : null;
  const awaiting = (appointments.data ?? []).filter((a) => isAwaitingPayment(a, now));
  const history = appointments.data ? groupAppointments(appointments.data, now).past : [];
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <>
      <section className="relative isolate min-h-52 overflow-hidden rounded-3xl bg-brand-deep shadow-sm">
        <ClinicImage
          src={clinicImages.hero}
          alt="A patient receiving friendly dental care"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-brand-deep/90 via-brand-deep/65 to-brand-deep/10" />
        <header className="relative flex min-h-52 max-w-2xl flex-col items-start justify-center p-6 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Patient dashboard</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">Welcome back, {firstName}</h1>
          <p className="mt-2 max-w-lg text-sm text-white/90 sm:text-base">A healthier, brighter smile is always within reach. Your care and appointments are all in one place.</p>
          <div className="mt-5"><ButtonLink to="/book" variant="light">Book an appointment</ButtonLink></div>
        </header>
      </section>

      {awaiting.length > 0 && (
        <SectionCard title="Finish your booking" viewAllTo="/patient/appointments">
          <div className="space-y-3">
            {awaiting.map((a) => (
              <AppointmentCard key={a.id} appointment={a} now={now} compact />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Your next appointment" viewAllTo="/patient/appointments">
        {appointments.isPending && <Skeleton className="h-28" />}
        {appointments.isError && <ErrorState onRetry={() => void appointments.refetch()} />}
        {appointments.data && next && <AppointmentCard appointment={next} now={now} />}
        {appointments.data && !next && (
          <div className="flex flex-col items-start gap-3 rounded-2xl bg-brand-soft/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">You have no upcoming appointments.</p>
            <ButtonLink to="/book">Book an appointment</ButtonLink>
          </div>
        )}
      </SectionCard>

      <QuickActions />

      <SectionCard title="Appointment history" viewAllTo="/patient/appointments">
        <ListBoundary query={appointments} empty={<EmptyHint>Your past visits will appear here.</EmptyHint>}>
          {() =>
            history.length === 0 ? (
              <EmptyHint>Your past visits will appear here.</EmptyHint>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 3).map((a) => (
                  <AppointmentCard key={a.id} appointment={a} now={now} compact />
                ))}
              </div>
            )
          }
        </ListBoundary>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Treatment records" viewAllTo="/patient/records">
          <ListBoundary query={records} empty={<EmptyHint>No treatment records yet. The dentist adds them after your visit.</EmptyHint>}>
            {(items) => (
              <div className="space-y-3">
                {items.slice(0, 3).map((r) => (
                  <RecordItem key={r.id} record={r} compact />
                ))}
              </div>
            )}
          </ListBoundary>
        </SectionCard>

        <SectionCard title="Prescriptions & care notes" viewAllTo="/patient/prescriptions">
          <ListBoundary query={prescriptions} empty={<EmptyHint>No prescriptions yet.</EmptyHint>}>
            {(items) => (
              <div className="space-y-3">
                {items.slice(0, 3).map((p) => (
                  <PrescriptionItem key={p.id} prescription={p} compact />
                ))}
              </div>
            )}
          </ListBoundary>
        </SectionCard>
      </div>

      <SectionCard title="Invoices & payments" viewAllTo="/patient/payments">
        <ListBoundary query={invoices} empty={<EmptyHint>Your invoices will appear here after your first payment.</EmptyHint>}>
          {(items) => <InvoiceTable invoices={items.slice(0, 3)} />}
        </ListBoundary>
      </SectionCard>

      <SectionCard title="Tips for a healthy smile">
        <CareTips />
      </SectionCard>
    </>
  );
}