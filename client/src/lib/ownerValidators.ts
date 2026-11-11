import { z } from "zod";

export const recordSchema = z.object({
  patientId: z.string().min(1, "Choose a patient"),
  appointmentId: z.string().optional(), // set when the form is opened from a visit
  title: z.string().trim().min(2, "Enter a short title").max(120, "Keep the title under 120 characters"),
  toothNo: z.string().trim().max(10, "Too long").regex(/^[0-9A-Za-z, -]*$/, "Use letters, numbers, commas or dashes").optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  summary: z.string().trim().min(5, "Describe the treatment (at least 5 characters)").max(1000, "Keep it under 1000 characters"),
});

export const prescriptionSchema = z.object({
  patientId: z.string().min(1, "Choose a patient"),
  recordId: z.string().optional(),
  medicine: z.string().trim().min(2, "Enter the medicine name").max(120, "Keep it under 120 characters"),
  instructions: z.string().trim().min(3, "Add instructions for the patient").max(500, "Keep it under 500 characters"),
});

export type RecordFormValues = z.infer<typeof recordSchema>;
export type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;
