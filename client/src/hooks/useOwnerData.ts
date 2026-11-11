import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPrescription, createRecord, getOwnerAppointments, getOwnerCalendar, getOwnerDay, retryRefund, getOwnerPatients, getOwnerStats, getAvailability, saveAvailability, setAppointmentStatus } from "../api/owner.api";
import type { ScheduleFilters } from "../api/owner.api";
import type { AvailabilityForm } from "../lib/availability";
import type { AppointmentStatus, PrescriptionInput, RecordInput } from "../types/api";
import { useOwnQuery, useUnauthorizedHandler } from "./useOwnQuery";

export const useOwnerStats = () => useOwnQuery("owner", ["stats"], getOwnerStats);
export const useOwnerAppointments = (date: string) => useOwnQuery("owner", ["appointments", date], () => getOwnerAppointments(date), { enabled: date !== "", staleTime: 10_000 });
export const useOwnerPatients = () => useOwnQuery("owner", ["patients"], getOwnerPatients);
export const useAvailability = () => useOwnQuery("owner", ["availability"], getAvailability, { staleTime: 0 });

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const onUnauthorized = useUnauthorizedHandler();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) => setAppointmentStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["owner", "appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["owner", "stats"] });
    },
    onError: onUnauthorized,
  });
}

export function useCreateRecord() {
  const onUnauthorized = useUnauthorizedHandler();
  return useMutation({ mutationFn: (body: RecordInput) => createRecord(body), onError: onUnauthorized });
}

export function useCreatePrescription() {
  const onUnauthorized = useUnauthorizedHandler();
  return useMutation({ mutationFn: (body: PrescriptionInput) => createPrescription(body), onError: onUnauthorized });
}

export function useSaveAvailability() {
  const queryClient = useQueryClient();
  const onUnauthorized = useUnauthorizedHandler();
  return useMutation({
    mutationFn: (form: AvailabilityForm) => saveAvailability(form),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["owner", "availability"] }),
    onError: onUnauthorized,
  });
}

export const useOwnerDay = (date: string, filters: ScheduleFilters) =>
  useOwnQuery("owner", ["appointments", "day", date, filters], () => getOwnerDay(date, filters), { enabled: date !== "", staleTime: 10_000 });

export const useOwnerCalendar = (from: string, to: string, filters: ScheduleFilters) =>
  useOwnQuery("owner", ["appointments", "calendar", from, to, filters], () => getOwnerCalendar(from, to, filters), { enabled: from !== "", staleTime: 10_000 });

export function useRetryRefund() {
  const queryClient = useQueryClient();
  const onUnauthorized = useUnauthorizedHandler();
  return useMutation({
    mutationFn: (appointmentId: string) => retryRefund(appointmentId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["owner"] }),
    onError: onUnauthorized,
  });
}
