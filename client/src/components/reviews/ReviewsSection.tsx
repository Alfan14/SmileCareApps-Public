import { useReviews } from "../../hooks/useContent";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/StateMessage";
import { ReviewCard } from "./ReviewCard";

export function ReviewsSection({ limit = 3, tinted = true }: { limit?: number; tinted?: boolean }) {
  const { data, isPending, isError, refetch } = useReviews();

  return (
    <section className={tinted ? "bg-brand-soft/60 py-16 sm:py-20" : "py-16 sm:py-20"}>
      <Container>
        <SectionHeading eyebrow="What our patients say" title="Happy smiles, brighter stories" />
        <div className="mt-10">
          {isPending && (
            <div className="grid gap-6 md:grid-cols-3">
              {Array.from({ length: limit }, (_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          )}
          {isError && <ErrorState onRetry={() => void refetch()} />}
          {data && data.length === 0 && <EmptyState title="No reviews yet" text="Be the first to share your experience." />}
          {data && data.length > 0 && (
            <ul className="grid gap-6 md:grid-cols-3">
              {data.slice(0, limit).map((r) => (
                <li key={r.id}>
                  <ReviewCard review={r} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}
