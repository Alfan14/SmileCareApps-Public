import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useCreateRecord } from "../../hooks/useOwnerData";
import { recordSchema } from "../../lib/ownerValidators";
import type { RecordFormValues } from "../../lib/ownerValidators";
import { todayInClinic } from "../../lib/dates";
import { inputClass } from "../../lib/formStyles";
import type { RecordInput } from "../../types/api";
import { FieldError } from "../auth/FieldError";
import { Button } from "../ui/Button";
import { PatientSelect } from "./PatientSelect";

type Props = { defaults: { patientId: string; appointmentId: string; title: string } };

export function RecordForm({ defaults }: Props) {
  const [today] = useState(() => todayInClinic());
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: { patientId: defaults.patientId, appointmentId: defaults.appointmentId, title: defaults.title, toothNo: "", date: today, summary: "" },
  });
  const create = useCreateRecord();
  const [saved, setSaved] = useState<{ recordId: string | null; patientId: string } | null>(null);

  const onSubmit = handleSubmit((v) => {
    const body: RecordInput = {
      patientId: v.patientId,
      title: v.title,
      summary: v.summary,
      date: v.date,
      ...(v.appointmentId ? { appointmentId: v.appointmentId } : {}),
      ...(v.toothNo ? { toothNo: v.toothNo } : {}),
    };
    create.mutate(body, { onSuccess: (res) => setSaved({ recordId: res.id, patientId: v.patientId }) });
  });

  if (saved) {
    const next = new URLSearchParams({ tab: "prescription", patientId: saved.patientId, ...(saved.recordId ? { recordId: saved.recordId } : {}) });
    return (
      <div role="status" className="rounded-2xl bg-brand-soft p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-brand-strong" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-bold">Treatment record saved</h2>
        <p className="mt-1 text-sm text-slate-600">The patient can see it in their dashboard.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to={`/owner/records?${next.toString()}`} className="rounded-full bg-brand-strong px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep">
            Add a prescription
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setSaved(null);
              create.reset();
              reset({ patientId: getValues("patientId"), appointmentId: "", title: "", toothNo: "", date: today, summary: "" });
            }}
          >
            Add another record
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Add treatment record">
      <div>
        <label htmlFor="rec-patient" className="text-sm font-medium text-slate-700">
          Patient *
        </label>
        <div className="mt-1">
          <PatientSelect id="rec-patient" aria-invalid={!!errors.patientId} aria-describedby="rec-patient-err" {...register("patientId")} />
        </div>
        <FieldError id="rec-patient-err" message={errors.patientId?.message} />
      </div>

      <input type="hidden" {...register("appointmentId")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rec-title" className="text-sm font-medium text-slate-700">
            Title *
          </label>
          <input id="rec-title" className={`mt-1 ${inputClass}`} aria-invalid={!!errors.title} aria-describedby="rec-title-err" {...register("title")} />
          <FieldError id="rec-title-err" message={errors.title?.message} />
        </div>
        <div>
          <label htmlFor="rec-date" className="text-sm font-medium text-slate-700">
            Date *
          </label>
          <input id="rec-date" type="date" max={today} className={`mt-1 ${inputClass}`} aria-invalid={!!errors.date} aria-describedby="rec-date-err" {...register("date")} />
          <FieldError id="rec-date-err" message={errors.date?.message} />
        </div>
      </div>

      <div>
        <label htmlFor="rec-tooth" className="text-sm font-medium text-slate-700">
          Tooth number (optional)
        </label>
        <input id="rec-tooth" className={`mt-1 max-w-[12rem] ${inputClass}`} aria-invalid={!!errors.toothNo} aria-describedby="rec-tooth-err" {...register("toothNo")} />
        <FieldError id="rec-tooth-err" message={errors.toothNo?.message} />
      </div>

      <div>
        <label htmlFor="rec-summary" className="text-sm font-medium text-slate-700">
          What was done *
        </label>
        <textarea id="rec-summary" rows={5} className={`mt-1 ${inputClass}`} aria-invalid={!!errors.summary} aria-describedby="rec-summary-err" {...register("summary")} />
        <FieldError id="rec-summary-err" message={errors.summary?.message} />
      </div>

      {create.isError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {create.error.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={create.isPending}>
        {create.isPending ? "Saving…" : "Save record"}
      </Button>
      <p className="text-xs text-slate-500">Demo data only. Please do not enter real patient information.</p>
    </form>
  );
}
