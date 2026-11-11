import type { User } from "../../types/api";

type Props = { user: User | null; isNewPatient: boolean; onNewPatientChange: (value: boolean) => void };

export function PatientStep({ user, isNewPatient, onNewPatientChange }: Props) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-500">Name</dt>
          <dd className="font-medium text-slate-800">{user?.name ?? "…"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Email</dt>
          <dd className="break-all font-medium text-slate-800">{user?.email ?? "…"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Phone</dt>
          <dd className="font-medium text-slate-800">{user?.phone ?? "Not provided"}</dd>
        </div>
      </dl>
      <p className="text-sm text-slate-500">The appointment is linked to your account. To change these details, please contact the clinic.</p>
      <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isNewPatient}
          onChange={(e) => onNewPatientChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 accent-brand-strong focus-visible:outline-2 focus-visible:outline-brand-deep"
        />
        I am a new patient at SmileCare Clinic
      </label>
    </div>
  );
}
