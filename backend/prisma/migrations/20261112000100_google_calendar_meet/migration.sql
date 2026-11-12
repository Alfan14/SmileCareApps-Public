-- Track one private Google Calendar event per video appointment.
ALTER TABLE "Appointment"
  ADD COLUMN "calendarEventId" TEXT,
  ADD COLUMN "meetCreatedAt" TIMESTAMP(3),
  ADD COLUMN "meetStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';

CREATE UNIQUE INDEX "Appointment_calendarEventId_key"
  ON "Appointment"("calendarEventId");
