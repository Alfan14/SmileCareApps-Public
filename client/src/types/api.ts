// Amounts are in paise (₹500 = 50000).
export type Treatment = {
  id: string;
  name: string;
  slug: string;
  description: string;
  durationMin: number;
  priceMin: number;
  priceMax: number;
  bookingPrice: number;
  imageUrl: string | null;
  sortOrder: number;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
};

export type Review = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type Role = "PATIENT" | "OWNER";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
};

// ---- Booking (Sprint 3) ----
export type ConsultationType = "IN_CLINIC" | "VIDEO";

/** One bookable time. `start` is an ISO timestamp; the clinic works in Asia/Kolkata (IST). */
export type Slot = { start: string; end?: string; label?: string };

export type Appointment = {
  id: string;
  status: string; // "PENDING" while the slot is held for payment
  holdExpiresAt: string | null;
  startTime?: string;
  endTime?: string;
};

export type CreateAppointmentPayload = {
  treatmentId: string;
  startTime: string;
  consultationType: ConsultationType;
  isNewPatient: boolean;
};

// ---- Payments (Sprint 4) ----
export type CheckoutResponse = { checkoutUrl: string; sessionId?: string };

/** Answer of GET /api/payments/appointments/:id. Only appointmentStatus is guaranteed. */
export type PaymentStatusResponse = {
  appointmentStatus: string; // PENDING | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW
  payment?: { status: string; amount?: number; paidAt?: string | null } | null; // PENDING | PAID | FAILED | REFUNDED
  invoice?: { number: string } | null;
};

// ---- Patient dashboard (Sprint 5) ----
// These are the shapes the UI uses. lib/normalize.ts converts whatever the API sends into them.
export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type MyAppointment = {
  id: string;
  startTime: string;
  endTime: string | null;
  status: AppointmentStatus;
  consultationType: ConsultationType;
  meetLink: string | null;
  holdExpiresAt: string | null;
  treatmentName: string;
  treatmentSlug: string | null;
  paymentStatus: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  amount: number | null; // paise
  treatmentId?: string | null; // needed to look up new slots when rescheduling
  rescheduleCount?: number;
  reviewId?: string | null; // set once the patient has reviewed this visit
  paymentFailureReason?: string | null;
  cancelReason?: string | null;
};

export type MyRecord = {
  id: string;
  title: string;
  summary: string;
  toothNo: string | null;
  date: string | null;
  appointmentId: string | null;
};

export type MyPrescription = {
  id: string;
  medicine: string;
  instructions: string;
  date: string | null;
  recordTitle: string | null;
};

export type MyInvoice = {
  id: string;
  number: string;
  issuedAt: string | null;
  amount: number | null; // paise
  status: string; // PAID | REFUNDED ...
  description: string;
  appointmentId: string | null;
  patientName: string | null;
  patientEmail: string | null;
};

// ---- Owner dashboard (Sprint 6) ----
export type OwnerAppointment = MyAppointment & {
  patientId: string | null;
  patientName: string;
  patientPhone: string | null;
  patientEmail: string | null;
  isNewPatient: boolean;
};

export type DayBucket = { date: string; completed: number; scheduled: number; noShow: number };
export type MonthBucket = { month: string; amount: number }; // "2026-10", paise
export type MixItem = { name: string; count: number };

export type OwnerBookingDay = {
  date: string;
  count: number;
};

export type OwnerRevenueDay = {
  date: string;
  revenuePaise: number;
  currency: string;
};

export type OwnerStats = {
  timezone: string;
  range: string;

  summary: {
    totalPatients: number | null;
    appointmentsToday: number | null;
    pendingAppointments: number | null;
    completedThisMonth: number | null;
    revenuePaiseThisMonth: number | null;
    paidTransactionsThisMonth: number | null;
    currency: string;
  };

  bookingsByDay: OwnerBookingDay[];
  revenueByDay: OwnerRevenueDay[];
  appointmentsByStatus: MixItem[];

  upcomingSchedule: OwnerAppointment[];
};

export type OwnerPatient = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  appointmentCount: number | null;
  lastVisit: string | null;
};

export type WorkingDay = {
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  isOff: boolean;
  startTime: string; // "09:00"
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  slotMinutes: number;
};

export type BlockedDate = { date: string; reason: string }; // date is "YYYY-MM-DD" (clinic date)
export type Availability = { workingHours: WorkingDay[]; blockedDates: BlockedDate[] };

export type RecordInput = { patientId: string; appointmentId?: string; title: string; summary: string; toothNo?: string; date?: string };
export type PrescriptionInput = { patientId: string; recordId?: string; medicine: string; instructions: string };

// ---- AI assistant (Sprint 7) ----
export type AiProvider = "mock" | "gemini" | "openai";
export type ChatRole = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };
export type ChatReply = { reply: string; provider: AiProvider | null };

/** What the owner sees. The API key itself never comes back, only whether one is saved and its last 4 characters. */
export type AiSettings = { provider: AiProvider; model: string; enabled: boolean; hasKey: boolean; keyLast4: string | null };
export type AiSettingsInput = { provider: AiProvider; model: string; enabled: boolean; apiKey?: string; clearKey?: boolean };
export type AiTestResult = { ok: boolean; message: string };
