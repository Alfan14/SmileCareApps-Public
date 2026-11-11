import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ApiError } from "../../api/client";
import { CancelledBanner } from "../../components/booking/CancelledBanner";
import { ConfirmStep } from "../../components/booking/ConfirmStep";
import { ConsultationStep } from "../../components/booking/ConsultationStep";
import { DateTimeStep } from "../../components/booking/DateTimeStep";
import { DentistStep } from "../../components/booking/DentistStep";
import { PatientStep } from "../../components/booking/PatientStep";
import { ReservedView } from "../../components/booking/ReservedView";
import type { Reserved } from "../../components/booking/ReservedView";
import { StepCard } from "../../components/booking/StepCard";
import { TreatmentStep } from "../../components/booking/TreatmentStep";
import { BookingSummary } from "../../components/booking/BookingSummary";
import { Container } from "../../components/ui/Container";
import { useCreateAppointment } from "../../hooks/useBooking";
import { authKey, useCurrentUser } from "../../hooks/useAuth";
import { useTreatments } from "../../hooks/useContent";
import { isBookableDate } from "../../lib/booking";
import { loadPendingPayment } from "../../lib/pendingPayment";
import type { ConsultationType } from "../../types/api";

/**
 * Sprint 3 booking wizard. Treatment and date live in the URL (?treatment=teeth-cleaning&date=2026-11-03),
 * so the home page's quick form can pre-fill them and a refresh or a login round-trip keeps them.
 * The last step holds the slot (PENDING) and the next screen sends the patient to Stripe to pay.
 * Stripe's cancel link returns here as /book?cancelled=1, which shows a banner with a "Resume payment" button.
 */
export function BookingPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const treatments = useTreatments();
  const create = useCreateAppointment();

  const slug = params.get("treatment") ?? "";
  const dateParam = params.get("date") ?? "";
  const date = isBookableDate(dateParam) ? dateParam : ""; // ignores past, closed or invalid dates from the URL
  const treatment = treatments.data?.find((t) => t.slug === slug);

  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [type, setType] = useState<ConsultationType>("IN_CLINIC");
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [reserved, setReserved] = useState<Reserved | null>(null);
  const [pendingPayment] = useState(() => loadPendingPayment());
  const showCancelled = params.get("cancelled") === "1";

  function setParam(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(key, value);
        return next;
      },
      { replace: true },
    );
  }

  function dismissCancelled() {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("cancelled");
        return next;
      },
      { replace: true },
    );
  }

  function chooseTreatment(nextSlug: string) {
    setParam("treatment", nextSlug);
    setSlotStart(null); // times depend on the treatment length
    create.reset();
  }

  function chooseDate(iso: string) {
    setParam("date", iso);
    setSlotStart(null);
    create.reset();
  }

  function reserve() {
    if (!treatment || !slotStart) return;
    create.mutate(
      { treatmentId: treatment.id, startTime: slotStart, consultationType: type, isNewPatient },
      {
        onSuccess: ({ appointment }) => {
          setReserved({ appointment, treatment, slotStart, type });
          void queryClient.invalidateQueries({ queryKey: ["slots"] });
        },
        onError: (err) => {
          const code = (err as ApiError).code;
          if (code === "SLOT_TAKEN") {
            setSlotStart(null); // someone else got there first: pick again from fresh times
            void queryClient.invalidateQueries({ queryKey: ["slots"] });
          }
          if (code === "UNAUTHENTICATED") {
            queryClient.setQueryData(authKey, null); // session expired: ProtectedRoute sends the visitor to /login and back
          }
        },
      },
    );
  }

  if (reserved) {
    return (
      <ReservedView
        reserved={reserved}
        onReset={() => {
          setReserved(null);
          setSlotStart(null);
          create.reset();
        }}
      />
    );
  }

  const missing = [!treatment && "a treatment", !date && "a date", !slotStart && "a time"].filter((m): m is string => m !== false);

  return (
    <>
      <section className="bg-gradient-to-b from-brand-soft to-white">
        <Container className="py-10 text-center sm:py-14">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Book your appointment</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">Choose a treatment and a time. You can review everything in the summary before reserving.</p>
        </Container>
      </section>

      {showCancelled && <CancelledBanner pending={pendingPayment} onDismiss={dismissCancelled} />}

      <section className="pb-16 pt-6 sm:pb-20">
      <Container className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="space-y-6">
            <StepCard number={1} title="Choose treatment" subtitle="Select the treatment you would like to book">
              <TreatmentStep selectedSlug={slug} onSelect={chooseTreatment} />
            </StepCard>

            <StepCard number={2} title="Your dentist" subtitle="You will be treated by our experienced dentist">
              <DentistStep />
            </StepCard>

            <StepCard number={3} title="Select date and time" subtitle="Choose a convenient day and time for your appointment">
              <DateTimeStep
                treatment={treatment}
                date={date}
                slotStart={slotStart}
                onDateChange={chooseDate}
                onSlotChange={(s) => {
                  setSlotStart(s);
                  create.reset();
                }}
              />
            </StepCard>

            <StepCard number={4} title="Consultation type" subtitle="Select how you would like to meet the dentist">
              <ConsultationStep value={type} onChange={setType} />
            </StepCard>

            <StepCard number={5} title="Patient details" subtitle="We use the details from your account">
              <PatientStep user={user} isNewPatient={isNewPatient} onNewPatientChange={setIsNewPatient} />
            </StepCard>

            <StepCard number={6} title="Reserve your slot" subtitle="Hold your time, then pay securely on Stripe">
              <ConfirmStep missing={missing} isPending={create.isPending} errorMessage={create.isError ? create.error.message : null} onReserve={reserve} />
            </StepCard>
          </div>

          <div className="lg:sticky lg:top-24">
            <BookingSummary treatment={treatment} slotStart={slotStart} type={type} />
          </div>
        </Container>
      </section>
    </>
  );
}
