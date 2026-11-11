import { z } from "zod";

const email = z.string().trim().pipe(z.email("Please enter a valid email address"));

const phone = z
  .string()
  .trim()
  .max(20, "That phone number is too long")
  .regex(/^[+0-9 ()-]*$/, "Use only digits, spaces and + ( ) -")
  .optional();

// Mirrors the server rules (server/src/validators/auth.schema.ts). The server always re-checks.
const newPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .refine((v) => new TextEncoder().encode(v).length <= 72, "Password is too long (72 bytes maximum)")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80, "That name is too long"),
  email,
  phone,
  message: z.string().trim().min(10, "Please write at least 10 characters").max(1000, "Please keep it under 1000 characters"),
  website: z.string().optional(), // honeypot: real users never fill this in
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name").max(80, "That name is too long"),
    email,
    phone,
    password: newPassword,
    confirmPassword: z.string().min(1, "Please repeat your password"),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export type ContactInput = z.infer<typeof contactSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
