import type { ComponentPropsWithRef } from "react";
import { useOwnerPatients } from "../../hooks/useOwnerData";
import { inputClass } from "../../lib/formStyles";

/** A patient dropdown that works with react-hook-form's register(). */
export function PatientSelect(props: Omit<ComponentPropsWithRef<"select">, "children">) {
  const { data, isPending, isError } = useOwnerPatients();
  return (
    <select {...props} className={inputClass} disabled={isPending || isError || props.disabled}>
      <option value="">{isPending ? "Loading patients…" : isError ? "Could not load patients" : "Choose a patient"}</option>
      {data?.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.email})
        </option>
      ))}
    </select>
  );
}
