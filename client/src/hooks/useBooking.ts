import { useMutation, useQuery } from "@tanstack/react-query";
import { createAppointment, getSlots } from "../api/booking.api";

export const useSlots = (date: string, treatmentId: string) =>
  useQuery({
    queryKey: ["slots", date, treatmentId],
    queryFn: () => getSlots(date, treatmentId),
    enabled: date !== "" && treatmentId !== "",
    staleTime: 15_000, // slots change quickly, so keep them fresh
  });

export const useCreateAppointment = () => useMutation({ mutationFn: createAppointment });
