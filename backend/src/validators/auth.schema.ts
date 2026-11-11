import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password must contain at least one letter and one number");

export const registerSchema = z.strictObject({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().max(20).regex(/^[+0-9 ()-]+$/).optional(),
});

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
