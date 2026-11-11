import { Star } from "lucide-react";
import { useState } from "react";
import { useSubmitReview } from "../../hooks/useAppointmentActions";
import { cn } from "../../lib/cn";
import { inputClass } from "../../lib/formStyles";
import { Button } from "../ui/Button";

/** Shown on a COMPLETED appointment that has no review yet. */
export function ReviewForm({ appointmentId }: { appointmentId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const submit = useSubmitReview();

  if (submit.isSuccess) {
    return <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Thank you! Your review will appear once the clinic approves it.</p>;
  }

  const valid = rating >= 1 && comment.trim().length >= 5;
  return (
    <form
      className="mt-3 rounded-xl border border-slate-200 p-3"
      onSubmit={(e) => { e.preventDefault(); if (valid) submit.mutate({ appointmentId, rating, comment: comment.trim() }); }}
    >
      <p className="text-sm font-semibold text-slate-800">How was your visit?</p>
      <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => setRating(n)} className="rounded p-0.5 focus-visible:outline-2 focus-visible:outline-brand-deep">
            <Star className={cn("h-6 w-6", n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} aria-hidden="true" />
          </button>
        ))}
      </div>
      <label htmlFor={`review-${appointmentId}`} className="sr-only">Your review</label>
      <textarea id={`review-${appointmentId}`} className={`${inputClass} mt-2`} rows={3} maxLength={1000} placeholder="Tell us about your experience" value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button type="submit" className="mt-2" disabled={!valid || submit.isPending}>{submit.isPending ? "Sending…" : "Submit review"}</Button>
      {submit.isError && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-2 text-sm text-red-800">{submit.error.message}</p>}
    </form>
  );
}
