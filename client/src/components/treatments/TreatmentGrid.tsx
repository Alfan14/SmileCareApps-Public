import { useTreatments } from "../../hooks/useContent";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/StateMessage";
import { TreatmentCard } from "./TreatmentCard";

export function TreatmentGrid({ limit }: { limit?: number }) {
  const { data, isPending, isError, refetch } = useTreatments();

  if (isPending) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: limit ?? 6 }, (_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const items = limit ? data.slice(0, limit) : data;
  if (items.length === 0) return <EmptyState title="No treatments available" text="Please check back soon." />;

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => (
        <li key={t.id}>
          <TreatmentCard treatment={t} />
        </li>
      ))}
    </ul>
  );
}
