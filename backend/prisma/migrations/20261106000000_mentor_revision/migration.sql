-- Mentor revision: cancel/reschedule, payment failure + refund tracking, reviews tied to appointments,
-- and a database-level guarantee against overlapping CONFIRMED appointments.

ALTER TABLE "Appointment"
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "cancelledBy" "Role",
  ADD COLUMN "rescheduleCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Payment"
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "stripeRefundId" TEXT,
  ADD COLUMN "refundedAt" TIMESTAMP(3);

ALTER TABLE "Review" ADD COLUMN "appointmentId" TEXT;
CREATE UNIQUE INDEX "Review_appointmentId_key" ON "Review"("appointmentId");
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_appointmentId_fkey" FOREIGN KEY ("appointmentId")
  REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Double-booking guard (single dentist => no two CONFIRMED appointments may overlap).
-- Cancelled/completed rows and short-lived PENDING holds are intentionally excluded; holds are
-- protected by the SERIALIZABLE transaction in appointments.service.ts.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Appointment"
  ADD CONSTRAINT "appointment_no_overlap"
  EXCLUDE USING gist (tsrange("startTime", "endTime") WITH &&)
  WHERE (status = 'CONFIRMED');
