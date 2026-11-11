import { Link, useSearchParams } from "react-router-dom";
import { PrescriptionForm } from "../../components/owner/PrescriptionForm";
import { RecordForm } from "../../components/owner/RecordForm";
import { cn } from "../../lib/cn";

const tabClass = (active: boolean) =>
  cn(
    "rounded-full px-4 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-deep",
    active ? "bg-brand-strong text-white" : "bg-brand-soft text-brand-deep hover:bg-brand-soft/70",
  );

/**
 * Adds a treatment record or a prescription. Other pages link here with the details filled in, for example
 * /owner/records?patientId=...&appointmentId=...&title=Teeth Cleaning (from a completed visit).
 */
export function OwnerRecordsPage() {
  const [params] = useSearchParams();
  const tab = params.get("tab") === "prescription" ? "prescription" : "record";
  const patientId = params.get("patientId") ?? "";
  const appointmentId = params.get("appointmentId") ?? "";
  const recordId = params.get("recordId") ?? "";
  const title = params.get("title") ?? "";
  const keep = (extra: Record<string, string>) => `/owner/records?${new URLSearchParams({ ...(patientId ? { patientId } : {}), ...extra }).toString()}`;

  return (
    <>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Add records</h1>
        <p className="mt-1 text-slate-600">Save what was done at a visit, and any medicine the patient should take.</p>
      </header>

      <div role="group" aria-label="What to add" className="flex gap-2">
        <Link to={keep({})} aria-current={tab === "record" ? "page" : undefined} className={tabClass(tab === "record")}>
          Treatment record
        </Link>
        <Link to={keep({ tab: "prescription" })} aria-current={tab === "prescription" ? "page" : undefined} className={tabClass(tab === "prescription")}>
          Prescription
        </Link>
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        {tab === "record" ? (
          <RecordForm key={`${patientId}|${appointmentId}|${title}`} defaults={{ patientId, appointmentId, title }} />
        ) : (
          <PrescriptionForm key={`${patientId}|${recordId}`} defaults={{ patientId, recordId }} />
        )}
      </section>
    </>
  );
}
