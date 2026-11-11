import { z } from "zod";

export const contactSchema = z.strictObject({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+0-9 ()-]*$/)
    .optional(),
  message: z.string().trim().min(10).max(1000),
  website: z.string().max(200).optional(), // honeypot: real users leave it empty
});

export type ContactBody = z.infer<typeof contactSchema>;
