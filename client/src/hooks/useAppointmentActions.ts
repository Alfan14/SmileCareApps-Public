import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelAppointment, rescheduleAppointment } from "../api/appointments.api";
import { submitReview } from "../api/reviews.api";
import type { ReviewInput } from "../api/reviews.api";
import { useUnauthorizedHandler } from "./useOwnQuery";

/** After any change to a visit, refresh every patient list (appointments, dashboard, invoices). */
function useRefreshPatient() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["patient"] });
}

export function useCancelAppointment() {
  const refresh = useRefreshPatient();
  const onUnauthorized = useUnauthorizedHandler();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelAppointment(id, reason),
    onSuccess: refresh,
    onError: onUnauthorized,
  });
}

export function useRescheduleAppointment() {
  const refresh = useRefreshPatient();
  const onUnauthorized = useUnauthorizedHandler();
  return useMutation({
    mutationFn: ({ id, startTime }: { id: string; startTime: string }) => rescheduleAppointment(id, startTime),
    onSuccess: refresh,
    onError: onUnauthorized,
  });
}

export function useSubmitReview() {
  const refresh = useRefreshPatient();
  const queryClient = useQueryClient();
  const onUnauthorized = useUnauthorizedHandler();
  return useMutation({
    mutationFn: (body: ReviewInput) => submitReview(body),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: onUnauthorized,
  });
}
