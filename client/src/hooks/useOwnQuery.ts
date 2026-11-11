import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "../api/client";
import { authKey } from "./useAuth";

/** Call from a mutation's onError: an expired session (401) logs the user out of the UI. */
export function useUnauthorizedHandler() {
  const queryClient = useQueryClient();
  return (err: Error) => {
    if ((err as ApiError).status === 401) queryClient.setQueryData(authKey, null);
  };
}

/**
 * Query for data that belongs to the logged-in user (patient or owner).
 * An expired session (401) logs the user out of the UI, and 4xx answers are not retried because they will not change.
 */
export function useOwnQuery<T>(scope: "patient" | "owner", key: readonly unknown[], fetcher: () => Promise<T>, options: { enabled?: boolean; staleTime?: number } = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [scope, ...key],
    queryFn: async () => {
      try {
        return await fetcher();
      } catch (err) {
        if ((err as ApiError).status === 401) queryClient.setQueryData(authKey, null);
        throw err;
      }
    },
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 30_000,
    retry: (count, err) => {
      const status = (err as ApiError).status;
      return count < 1 && !(typeof status === "number" && status < 500);
    },
  });
}
