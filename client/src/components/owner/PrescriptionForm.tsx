import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useCreatePrescription } from "../../hooks/useOwnerData";
import { prescriptionSchema } from "../../lib/ownerValidators";
import type { PrescriptionFormValues } from "../../lib/ownerValidators";
import { inputClass } from "../../lib/formStyles";
import type { PrescriptionInput } from "../../types/api";
import { FieldError } from "../auth/FieldError";
import { Button } from "../ui/Button";
import { PatientSelect } from "./PatientSelect";

type Props = { defaults: { patientId: string; recordId: string } };

export function PrescriptionForm({ defaults }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: { patientId: defaults.patientId, recordId: defaults.recordId, medicine: "", instructions: "" },
  });
  const create = useCreatePrescription();

  const onSubmit = handleSubmit((v) => {
    const body: PrescriptionInput = { patientId: v.patientId, medicine: v.medicine, instructions: v.instructions, ...(v.recordId ? { recordId: v.recordId } : {}) };
    create.mutate(body);
  });

  if (create.isSuccess) {
    return (
      <div role="status" className="rounded-2xl bg-brand-soft p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-brand-strong" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-bold">Prescription saved</h2>
        <p className="mt-1 text-sm text-slate-600">The patient can see it in their dashboard.</p>
        <div className="mt-5 flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              create.reset();
              reset({ patientId: getValues("patientId"), recordId: getValues("recordId") ?? "", medicine: "", instructions: "" });
            }}
          >
            Add another prescription
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Add prescription">
      <div>
        <label htmlFor="rx-patient" className="text-sm font-medium text-slate-700">
          Patient *
        </label>
        <div className="mt-1">
          <PatientSelect id="rx-patient" aria-invalid={!!errors.patientId} aria-describedby="rx-patient-err" {...register("patientId")} />
        </div>
        <FieldError id="rx-patient-err" message={errors.patientId?.message} />
      </div>

      <input type="hidden" {...register("recordId")} />

      <div>
        <label htmlFor="rx-medicine" className="text-sm font-medium text-slate-700">
          Medicine *
        </label>
        <input id="rx-medicine" className={`mt-1 ${inputClass}`} aria-invalid={!!errors.medicine} aria-describedby="rx-medicine-err" {...register("medicine")} />
        <FieldError id="rx-medicine-err" message={errors.medicine?.message} />
      </div>

      <div>
        <label htmlFor="rx-instructions" className="text-sm font-medium text-slate-700">
          Instructions *
        </label>
        <textarea id="rx-instructions" rows={4} className={`mt-1 ${inputClass}`} aria-invalid={!!errors.instructions} aria-describedby="rx-instructions-err" {...register("instructions")} />
        <FieldError id="rx-instructions-err" message={errors.instructions?.message} />
      </div>

      {create.isError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {create.error.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={create.isPending}>
        {create.isPending ? "Saving…" : "Save prescription"}
      </Button>
    </form>
  );
}
