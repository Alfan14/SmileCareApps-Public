// TARGET: server/src/config/env.ts
// Validates environment variables once at startup. The server refuses to start if something is wrong.
import "dotenv/config";
import { z } from "zod";

const bool = z.enum(["true", "false"]).default("false").transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url(),
  CLIENT_URL: z.string().url(),
  SERVE_CLIENT: bool,
  CROSS_SITE: bool,
  SESSION_SECRET: z.string().min(16),
  APP_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 bytes, base64 encoded"),
  DATABASE_URL: z.string().min(1),

  // Safety guard for the take-home: refuse live Stripe keys. Remove this check if you ever go live.
  STRIPE_SECRET_KEY: z.string().startsWith("sk_test_", "use a Stripe TEST key"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),

  AI_PROVIDER: z.enum(["gemini", "openai", "mock"]).default("mock"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),

  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("SmileCare Clinic <hello@smilecare.test>"),

  MEET_LINK: z.string().url().optional(),
  CLINIC_NAME: z.string().default("SmileCare Clinic"),
  CLINIC_ADDRESS: z.string().default("123 Smile Street, Indiranagar, Bengaluru 560038"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  process.exit(1);
}
export const env = parsed.data;
