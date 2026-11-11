import { z } from "zod";

const historyMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(1000),
  })
  .strict();

export const aiChatSchema = z
  .object({
    message: z.string().trim().min(1).max(1200),
    history: z.array(historyMessageSchema).max(6).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    const chars =
      value.message.length +
      value.history.reduce((sum, item) => sum + item.content.length, 0);
    if (chars > 5000)
      ctx.addIssue({
        code: "custom",
        path: ["history"],
        message: "The combined message history cannot exceed 5000 characters",
      });
  });

export const ownerAiSettingsSchema = z
  .object({
    provider: z.enum(["mock", "openai"]),
    model: z.literal("gpt-6-luna").default("gpt-6-luna"),
    enabled: z.boolean().default(true),
    // Optional: omit to retain the current encrypted key. Never return it to a client.
    apiKey: z.string().trim().min(20).max(300).startsWith("sk-").optional(),
  })
  .strict();

export type AiChatBody = z.infer<typeof aiChatSchema>;
export type OwnerAiSettingsBody = z.infer<typeof ownerAiSettingsSchema>;
