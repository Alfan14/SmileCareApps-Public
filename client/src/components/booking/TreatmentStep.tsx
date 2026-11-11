import { Clock } from "lucide-react";
import { useTreatments } from "../../hooks/useContent";
import { formatDuration, formatPaise } from "../../lib/format";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/StateMessage";
import { TreatmentIcon } from "../treatments/TreatmentIcon";
import { OptionCard } from "./OptionCard";

type Props = { selectedSlug: string; onSelect: (slug: string) => void };

export function TreatmentStep({ selectedSlug, onSelect }: Props) {
  const { data, isPending, isError, refetch } = useTreatments();

  if (isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (data.length === 0) return <EmptyState title="No treatments available" text="Please check back soon." />;

  return (
    <fieldset>
      <legend className="sr-only">Treatment</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((t) => (
          <OptionCard key={t.id} name="treatment" value={t.slug} checked={selectedSlug === t.slug} onChange={() => onSelect(t.slug)}>
            <span className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                <TreatmentIcon slug={t.slug} className="h-5 w-5" />
              </span>
              <span className="pr-6">
                <span className="block font-semibold text-brand-deep">{t.name}</span>
                <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDuration(t.durationMin)}
                </span>
                <span className="mt-1 block text-sm font-medium text-slate-700">Online fee {formatPaise(t.bookingPrice)}</span>
              </span>
            </span>
          </OptionCard>
        ))}
      </div>
    </fieldset>
  );
}
