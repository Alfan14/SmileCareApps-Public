import { formatReviewDate } from "../../lib/format";
import type { Review } from "../../types/api";
import { StarRating } from "../ui/StarRating";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <StarRating value={review.rating} />
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">“{review.comment}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-deep">
          {review.authorName.charAt(0)}
        </span>
        <span className="text-sm">
          <span className="block font-semibold text-brand-deep">{review.authorName}</span>
          <span className="text-slate-500">{formatReviewDate(review.createdAt)}</span>
        </span>
      </figcaption>
    </figure>
  );
}
