-- Sprint 4: persist delivery state so confirmation emails can be retried safely.
ALTER TABLE "Invoice" ADD COLUMN "emailSentAt" TIMESTAMP(3);
