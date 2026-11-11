import { api } from "./client";

export type CancelResult = {
  id: string;
  status: "CANCELLED";
  refundStatus: string | null;
};

/** Patient cancellation. Server enforces the cancellation cutoff. */
export const cancelAppointment = (id: string, reason?: string) =>
  api<CancelResult>(
    `/appointments/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    },
  );

/** Reschedule an appointment to another available slot. */
export const rescheduleAppointment = (
  id: string,
  startTime: string,
) =>
  api<{
    appointment: {
      id: string;
      startTime: string;
      endTime: string;
    };
  }>(
    `/appointments/${encodeURIComponent(id)}/reschedule`,
    {
      method: "POST",
      body: JSON.stringify({ startTime }),
    },
  );
