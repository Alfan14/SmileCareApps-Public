// Validates environment variables once at startup. The server refuses to start if something is wrong.
// Sprint 1 only needs DATABASE_URL. Variables for later sprints are optional for now and become
// required (with strict checks) when their feature is built: see docs/templates/reference/server/env.ts.
import "dotenv/config";
import { z } from "zod";

const bool = z.enum(["true", "false"]).default("false").transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.url().default("http://localhost:5173"),
  CLIENT_URL: z.url().default("http://localhost:5173"),
  SERVE_CLIENT: bool,
  CROSS_SITE: bool,
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Session secret is required for Sprint 2 auth; Stripe, AI, and email settings remain optional.
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_ENCRYPTION_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "STRIPE_SECRET_KEY must be a Stripe secret key").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "STRIPE_WEBHOOK_SECRET must start with whsec_").optional(),
  AI_PROVIDER: z.enum(["openai", "mock"]).default("mock"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-6-luna"),
  // In-app hard budget for OpenAI requests; keep at or below $8 to leave external billing headroom.
  AI_BUDGET_USD: z.coerce.number().min(0.01).max(8).default(8),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("SmileCare Clinic <hello@smilecare.test>"),
  // Dentist/owner inbox for new-booking, cancellation and reschedule notifications.
  DENTIST_EMAIL: z.string().email().optional(),
  CANCEL_CUTOFF_HOURS: z.coerce.number().int().min(0).max(168).default(24),
  MAX_RESCHEDULES: z.coerce.number().int().min(0).max(10).default(2),
  CLINIC_NAME: z.string().default("SmileCare Clinic"),
  CLINIC_ADDRESS: z.string().default("Clinic address not configured"),
  CLINIC_TIMEZONE: z.string().default("Asia/Kolkata").refine((value) => {
    try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; }
  }, "CLINIC_TIMEZONE must be a valid IANA timezone"),
  // Set true in Render only after the Google OAuth refresh token has been generated.
  GOOGLE_MEET_ENABLED: bool,
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().default("primary"),
  // Legacy static link is retained only as an explicit fallback when Google Meet is disabled.
  MEET_LINK: z.string().optional(),
});

// Treat "KEY=" (empty) in .env files as "not set".
const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""));

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const i of parsed.error.issues) console.error(`  - ${i.path.join(".")}: ${i.message}`);
  process.exit(1);
}

export const env = parsed.data;