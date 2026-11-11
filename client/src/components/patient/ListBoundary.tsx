import type { ReactNode } from "react";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/StateMessage";

type Props<T> = {
  query: { data: T[] | undefined; isPending: boolean; isError: boolean; refetch: () => unknown };
  empty: ReactNode;
  skeletons?: number;
  children: (items: T[]) => ReactNode;
};

/** Shows loading placeholders, an error with retry, an empty message, or the list. */
export function ListBoundary<T>({ query, empty, skeletons = 2, children }: Props<T>) {
  if (query.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: skeletons }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  if (!query.data || query.data.length === 0) return <>{empty}</>;
  return <>{children(query.data)}</>;
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{children}</p>;
}
