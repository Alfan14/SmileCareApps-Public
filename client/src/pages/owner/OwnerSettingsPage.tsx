import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorState } from "../../components/ui/StateMessage";
import { useAvailability, useSaveAvailability } from "../../hooks/useOwnerData";
import { availabilitySchema, toForm } from "../../lib/availability";
import type { AvailabilityForm } from "../../lib/availability";
import { formatLongDate, todayInClinic } from "../../lib/dates";
import { inputClass } from "../../lib/formStyles";
import { DAY_NAMES } from "../../lib/normalizeOwner";
import type { Availability } from "../../types/api";

type EditorProps = { initial: Availability; saving: boolean; saved: boolean; error: string | null; onSave: (v: AvailabilityForm) => Promise<boolean> };

const cell = `${inputClass} !px-2 !py-1.5`;

function AvailabilityEditor({ initial, saving, saved, error, onSave }: EditorProps) {
  const [today] = useState(() => todayInClinic());
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<AvailabilityForm>({ resolver: zodResolver(availabilitySchema), defaultValues: toForm(initial) });
  const { fields: blockedFields, append, remove } = useFieldArray({ control, name: "blocked" });
  const hours = useWatch({ control, name: "hours" });

  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");

  function addBlocked() {
    if (!newDate) return;
    append({ date: newDate, reason: newReason.trim() }, { shouldFocus: false });
    setNewDate("");
    setNewReason("");
  }

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        if (await onSave(values)) reset(values); // the saved values become the new starting point
      })}
      noValidate className="space-y-8" aria-label="Opening hours and days off">
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">Weekly opening hours</h2>
        <p className="mt-1 text-sm text-slate-600">Times are in India time. The slot length is how often a new appointment can start.</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <caption className="sr-only">Opening hours per weekday</caption>
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="py-2 pr-3 font-semibold">Day</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Closed</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Opens</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Closes</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Break from</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Break to</th>
                <th scope="col" className="py-2 font-semibold">Slot (min)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initial.workingHours.map((d, i) => {
                const name = DAY_NAMES[d.dayOfWeek] ?? "Day";
                const off = hours?.[i]?.isOff ?? d.isOff;
                const e = errors.hours?.[i];
                const messages = [e?.startTime, e?.endTime, e?.breakStart, e?.breakEnd, e?.slotMinutes].flatMap((x) => (x?.message ? [x.message] : []));
                return (
                  <tr key={d.dayOfWeek} className="align-top">
                    <th scope="row" className="py-3 pr-3 font-semibold text-brand-deep">
                      {name}
                      <input type="hidden" {...register(`hours.${i}.dayOfWeek`, { valueAsNumber: true })} />
                    </th>
                    <td className="py-3 pr-3">
                      <input type="checkbox" aria-label={`${name} closed`} className="h-4 w-4 accent-brand-strong" {...register(`hours.${i}.isOff`)} />
                    </td>
                    <td className="py-3 pr-3"><input type="time" aria-label={`${name} opens`} className={cell} disabled={off} {...register(`hours.${i}.startTime`)} /></td>
                    <td className="py-3 pr-3"><input type="time" aria-label={`${name} closes`} className={cell} disabled={off} {...register(`hours.${i}.endTime`)} /></td>
                    <td className="py-3 pr-3"><input type="time" aria-label={`${name} break from`} className={cell} disabled={off} {...register(`hours.${i}.breakStart`)} /></td>
                    <td className="py-3 pr-3"><input type="time" aria-label={`${name} break to`} className={cell} disabled={off} {...register(`hours.${i}.breakEnd`)} /></td>
                    <td className="py-3">
                      <input type="number" aria-label={`${name} slot length in minutes`} className={`${cell} w-20`} disabled={off} {...register(`hours.${i}.slotMinutes`, { valueAsNumber: true })} />
                      {messages.length > 0 && (
                        <ul role="alert" className="mt-1 space-y-0.5 text-xs text-red-700">
                          {messages.map((m) => (
                            <li key={m}>
                              {name}: {m}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">Days off</h2>
        <p className="mt-1 text-sm text-slate-600">Holidays or leave. Patients cannot book these days.</p>

        {blockedFields.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No days off are set.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100">
            {blockedFields.map((f, i) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 p-3">
                <span className="font-semibold text-brand-deep">{formatLongDate(f.date)}</span>
                <span className="flex-1 text-sm text-slate-600">{f.reason || "No reason given"}</span>
                {errors.blocked?.[i]?.date && <span role="alert" className="text-xs text-red-700">{errors.blocked[i]?.date?.message}</span>}
                <input type="hidden" {...register(`blocked.${i}.date`)} />
                <input type="hidden" {...register(`blocked.${i}.reason`)} />
                <Button variant="ghost" onClick={() => remove(i)} aria-label={`Remove ${formatLongDate(f.date)}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="blocked-date" className="text-sm font-medium text-slate-700">
              Date
            </label>
            <input id="blocked-date" type="date" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="blocked-reason" className="text-sm font-medium text-slate-700">
              Reason (optional)
            </label>
            <input id="blocked-reason" value={newReason} maxLength={100} onChange={(e) => setNewReason(e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <Button variant="outline" onClick={addBlocked} disabled={!newDate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add day off
          </Button>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {saved && !isDirty && (
        <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          Saved. New bookings follow these hours. Appointments that are already booked are not changed.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={saving || !isDirty}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {isDirty && <span className="text-sm text-amber-800">You have unsaved changes.</span>}
      </div>
    </form>
  );
}

export function OwnerSettingsPage() {
  const query = useAvailability();
  const save = useSaveAvailability();

  return (
    <>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Hours & days off</h1>
        <p className="mt-1 text-slate-600">Control when patients can book.</p>
      </header>

      {query.isPending && <Skeleton className="h-96" />}
      {query.isError && <ErrorState onRetry={() => void query.refetch()} />}
      {query.data && (
        // The key makes the form start fresh from the server's saved values after each save.
        <AvailabilityEditor
          key={JSON.stringify(query.data)}
          initial={query.data}
          saving={save.isPending}
          saved={save.isSuccess}
          error={save.isError ? save.error.message : null}
          onSave={async (values) => {
            try {
              await save.mutateAsync(values);
              return true;
            } catch {
              return false; // the error message comes from save.error
            }
          }}
        />
      )}
    </>
  );
}
