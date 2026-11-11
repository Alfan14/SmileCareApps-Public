import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errors";
import { decryptSecret, encryptSecret } from "../utils/ai-crypto";
import type { AiChatBody, OwnerAiSettingsBody } from "../validators/ai.schema";
import { buildSystemPrompt, SYSTEM_PROMPT_VERSION } from "./ai-prompt";

export const DEFAULT_AI_MODEL = "gpt-6-luna";
const INPUT_USD_PER_MILLION = 0.1;
const OUTPUT_USD_PER_MILLION = 0.5;
const MICRO_USD_PER_USD = 1_000_000;
const MAX_RESERVED_INPUT_TOKENS = 18_000;
const MAX_OUTPUT_TOKENS = 400;
const MAX_OUTPUT_CHARS = 5_000;
// Reserve $0.002 per live request. This deliberately over-reserves relative to the usual chat size.
const REQUEST_RESERVATION_MICROS = Math.ceil(
  MAX_RESERVED_INPUT_TOKENS * INPUT_USD_PER_MILLION +
    MAX_OUTPUT_TOKENS * OUTPUT_USD_PER_MILLION,
);

type AiProvider = "mock" | "openai";
type StoredAiSettings = {
  id: number;
  provider: string;
  model: string | null;
  encryptedKey: string | null;
  iv: string | null;
  authTag: string | null;
  keyLast4: string | null;
  enabled: boolean;
};

function budgetMicros(): number {
  return Math.round(env.AI_BUDGET_USD * MICRO_USD_PER_USD);
}
function usd(micros: number): number {
  return Number((micros / MICRO_USD_PER_USD).toFixed(6));
}
function calculateCostMicros(
  inputTokens: number,
  outputTokens: number,
): number {
  return Math.ceil(
    inputTokens * INPUT_USD_PER_MILLION + outputTokens * OUTPUT_USD_PER_MILLION,
  );
}
function isValidProvider(value: string): value is AiProvider {
  return value === "mock" || value === "openai";
}

async function readSettings(): Promise<StoredAiSettings | null> {
  const row = await prisma.aiSettings.findUnique({ where: { id: 1 } });
  return row as StoredAiSettings | null;
}

async function resolveRuntimeConfig(): Promise<{
  provider: AiProvider;
  model: string;
  apiKey?: string;
  enabled: boolean;
}> {
  const settings = await readSettings();
  const providerText = settings?.provider ?? env.AI_PROVIDER;
  if (!isValidProvider(providerText))
    throw new HttpError(
      503,
      "AI_PROVIDER_INVALID",
      "AI provider is not supported",
    );
  const model = settings?.model || env.AI_MODEL || DEFAULT_AI_MODEL;
  if (model !== DEFAULT_AI_MODEL)
    throw new HttpError(
      503,
      "AI_MODEL_NOT_ALLOWED",
      "Only the budget-approved GPT-6 Luna model is enabled",
    );
  const enabled = settings?.enabled ?? true;
  if (!enabled)
    throw new HttpError(
      503,
      "AI_DISABLED",
      "The clinic assistant is currently disabled",
    );

  if (providerText === "mock") return { provider: "mock", model, enabled };

  let apiKey = env.AI_API_KEY;
  if (settings?.encryptedKey && settings.iv && settings.authTag) {
    apiKey = decryptSecret({
      encryptedKey: settings.encryptedKey,
      iv: settings.iv,
      authTag: settings.authTag,
    });
  }
  if (!apiKey)
    throw new HttpError(
      503,
      "AI_API_KEY_MISSING",
      "OpenAI is selected but no API key is configured",
    );
  return { provider: "openai", model, apiKey, enabled };
}

async function publicClinicContext() {
  const [treatments, faqs] = await Promise.all([
    prisma.treatment.findMany({
      where: { active: true },
      select: {
        name: true,
        description: true,
        durationMin: true,
        priceMin: true,
        priceMax: true,
        bookingPrice: true,
      },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
    prisma.faq.findMany({
      select: { question: true, answer: true, category: true },
      orderBy: { sortOrder: "asc" },
      take: 10,
    }),
  ]);
  return {
    clinicName: env.CLINIC_NAME,
    address: env.CLINIC_ADDRESS,
    treatments: treatments.map((item) => ({
      ...item,
      name: item.name.slice(0, 100),
      description: item.description.slice(0, 350),
    })),
    faqs: faqs.map((item) => ({
      question: item.question.slice(0, 180),
      answer: item.answer.slice(0, 450),
      category: item.category.slice(0, 80),
    })),
  };
}

function mockReply(
  message: string,
  context: Awaited<ReturnType<typeof publicClinicContext>>,
): string {
  const normalized = message.toLowerCase();
  if (
    /\b(breath|breathing|swallow|uncontrolled bleeding|major trauma)\b|sulit bernapas|susah bernapas|sulit menelan|perdarahan tidak berhenti/i.test(
      message,
    )
  ) {
    return "Gejala yang Anda sebutkan bisa memerlukan pertolongan segera. Silakan cari layanan gawat darurat setempat sekarang; jangan menunggu balasan chat klinik.";
  }
  if (
    /diagnos|prescri|medicine|medication|obat apa|resep|gejala|symptom|sakit gigi|toothache|bleeding gum/i.test(
      normalized,
    )
  ) {
    return "Saya adalah asisten informasi klinik, bukan dokter gigi, sehingga tidak dapat mendiagnosis atau meresepkan obat. Silakan konsultasikan gejala pribadi Anda kepada dokter gigi atau tenaga kesehatan yang berkualifikasi.";
  }
  if (
    /book|booking|appointment|jadwal|reservasi|slot|janji temu/i.test(
      normalized,
    )
  ) {
    return "Anda dapat membuka halaman booking untuk memilih layanan, tanggal, dan slot yang tersedia. Saya tidak dapat memastikan ketersediaan slot langsung dari percakapan ini.";
  }
  const faq = context.faqs.find((item) => {
    const words = item.question
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3);
    return words.some((word) => normalized.includes(word));
  });
  if (faq) return faq.answer;
  const treatment = context.treatments.find((item) =>
    normalized.includes(item.name.toLowerCase()),
  );
  if (treatment) {
    return `${treatment.name}: ${treatment.description} Estimasi durasi ${treatment.durationMin} menit; kisaran harga ₹${(treatment.priceMin / 100).toLocaleString("en-IN")}–₹${(treatment.priceMax / 100).toLocaleString("en-IN")}. Konfirmasi harga akhir dengan klinik.`;
  }
  return `Halo, saya asisten informasi ${context.clinicName}. Saya dapat membantu menjelaskan layanan dan FAQ yang terdaftar, serta cara melakukan booking. Untuk informasi yang tidak tercantum, silakan hubungi klinik secara langsung.`;
}

async function reserveBudget(requestId: string, model: string): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        const totals = await tx.aiUsage.aggregate({
          _sum: { costMicros: true },
        });
        const used = totals._sum.costMicros ?? 0;
        if (used + REQUEST_RESERVATION_MICROS > budgetMicros()) {
          throw new HttpError(
            429,
            "AI_BUDGET_EXHAUSTED",
            "The AI testing budget has been reached. No API request was sent.",
          );
        }
        await tx.aiUsage.create({
          data: {
            requestId,
            model,
            status: "RESERVED",
            inputTokens: 0,
            outputTokens: 0,
            costMicros: REQUEST_RESERVATION_MICROS,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    // Serialization conflict should fail closed; never send a provider request without a reservation.
    throw new HttpError(
      503,
      "AI_BUDGET_RESERVATION_FAILED",
      "Could not reserve AI budget; please retry",
    );
  }
}

function extractText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim())
    return payload.output_text.trim();
  const output = Array.isArray(payload.output) ? payload.output : [];
  const texts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const record = part as { type?: unknown; text?: unknown };
      if (record.type === "output_text" && typeof record.text === "string")
        texts.push(record.text);
    }
  }
  return texts.join("\n").trim();
}

async function callOpenAI(
  apiKey: string,
  model: string,
  body: AiChatBody,
  context: Awaited<ReturnType<typeof publicClinicContext>>,
) {
  const instructions = buildSystemPrompt(context);
  const input = [
    ...body.history.map((item) => ({ role: item.role, content: item.content })),
    { role: "user", content: body.message },
  ];
  const requestId = randomUUID();
  await reserveBudget(requestId, model);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        reasoning: {
          effort: "none"
        },
        max_output_tokens: MAX_OUTPUT_TOKENS,
        store: false
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) {
      // Do not log or return provider response bodies; they may contain operational metadata.
      await prisma.aiUsage
        .update({ where: { requestId }, data: { status: "FAILED" } })
        .catch(() => {});
      if (response.status === 429)
        throw new HttpError(
          503,
          "AI_PROVIDER_RATE_LIMIT",
          "The AI provider is busy. Please retry shortly.",
        );
      throw new HttpError(
        502,
        "AI_PROVIDER_ERROR",
        "The AI provider did not complete this request",
      );
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const reply = extractText(payload);
    if (!reply) {
      await prisma.aiUsage
        .update({ where: { requestId }, data: { status: "FAILED" } })
        .catch(() => {});
      throw new HttpError(
        502,
        "AI_EMPTY_RESPONSE",
        "The AI provider returned no text",
      );
    }
    const usage =
      payload.usage && typeof payload.usage === "object"
        ? (payload.usage as Record<string, unknown>)
        : {};
    const hasUsage =
      Number.isInteger(usage.input_tokens) &&
      Number.isInteger(usage.output_tokens);
    const inputTokens = hasUsage ? Number(usage.input_tokens) : 0;
    const outputTokens = hasUsage ? Number(usage.output_tokens) : 0;
    // If usage metadata is unexpectedly missing, retain the reservation rather than accounting a zero cost.
    const actualCostMicros = hasUsage
      ? calculateCostMicros(inputTokens, outputTokens)
      : REQUEST_RESERVATION_MICROS;
    await prisma.aiUsage.update({
      where: { requestId },
      data: {
        status: "SUCCEEDED",
        inputTokens,
        outputTokens,
        costMicros: actualCostMicros,
      },
    });
    return {
      reply: reply.slice(0, MAX_OUTPUT_CHARS),
      mode: "openai" as const,
      model,
      promptVersion: SYSTEM_PROMPT_VERSION,
      requestId,
      usage: {
        inputTokens,
        outputTokens,
        estimatedCostUsd: usd(actualCostMicros),
      },
    };
  } catch (error) {
    // Reservations for unknown/network failures are intentionally retained: fail closed against budget overrun.
    if (
      !(
        error instanceof HttpError &&
        [
          "AI_PROVIDER_RATE_LIMIT",
          "AI_PROVIDER_ERROR",
          "AI_EMPTY_RESPONSE",
        ].includes(error.code)
      )
    ) {
      await prisma.aiUsage
        .update({ where: { requestId }, data: { status: "FAILED" } })
        .catch(() => {});
    }
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      502,
      "AI_PROVIDER_UNAVAILABLE",
      "The AI provider is temporarily unavailable",
    );
  }
}

export async function sendChat(body: AiChatBody) {
  const [config, context] = await Promise.all([
    resolveRuntimeConfig(),
    publicClinicContext(),
  ]);
  if (config.provider === "mock") {
    return {
      reply: mockReply(body.message, context),
      mode: "mock" as const,
      model: config.model,
      promptVersion: SYSTEM_PROMPT_VERSION,
      requestId: randomUUID(),
      usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
    };
  }
  return callOpenAI(config.apiKey!, config.model, body, context);
}

export async function getAiSettings() {
  const settings = await readSettings();
  const provider = settings?.provider ?? env.AI_PROVIDER;
  const keyConfigured = Boolean(
    (settings?.encryptedKey && settings.iv && settings.authTag) ||
    env.AI_API_KEY,
  );
  return {
    provider,
    model: settings?.model || env.AI_MODEL || DEFAULT_AI_MODEL,
    enabled: settings?.enabled ?? true,
    keyConfigured: provider === "openai" ? keyConfigured : false,
    keyLast4:
      provider === "openai"
        ? (settings?.keyLast4 ??
          (env.AI_API_KEY ? env.AI_API_KEY.slice(-4) : null))
        : null,
    promptVersion: SYSTEM_PROMPT_VERSION,
    budgetUsd: env.AI_BUDGET_USD,
  };
}

export async function updateAiSettings(body: OwnerAiSettingsBody) {
  const existing = await readSettings();
  if (
    body.provider === "openai" &&
    !body.apiKey &&
    !existing?.encryptedKey &&
    !env.AI_API_KEY
  ) {
    throw new HttpError(
      422,
      "AI_API_KEY_REQUIRED",
      "Provide an API key or configure AI_API_KEY in the server environment",
    );
  }

  const encrypted = body.apiKey ? encryptSecret(body.apiKey) : null;
  if (
    body.provider === "openai" &&
    !encrypted &&
    existing?.encryptedKey &&
    (!existing.iv || !existing.authTag)
  ) {
    throw new HttpError(
      503,
      "AI_KEY_STORAGE_INVALID",
      "The saved OpenAI key is incomplete",
    );
  }
  const keyFields =
    body.provider === "mock"
      ? { encryptedKey: null, iv: null, authTag: null, keyLast4: null }
      : encrypted
        ? { ...encrypted, keyLast4: body.apiKey!.slice(-4) }
        : {};

  await prisma.aiSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      provider: body.provider,
      model: DEFAULT_AI_MODEL,
      enabled: body.enabled,
      encryptedKey:
        body.provider === "openai"
          ? (encrypted?.encryptedKey ?? existing?.encryptedKey ?? null)
          : null,
      iv:
        body.provider === "openai"
          ? (encrypted?.iv ?? existing?.iv ?? null)
          : null,
      authTag:
        body.provider === "openai"
          ? (encrypted?.authTag ?? existing?.authTag ?? null)
          : null,
      keyLast4:
        body.provider === "openai"
          ? (body.apiKey?.slice(-4) ??
            existing?.keyLast4 ??
            env.AI_API_KEY?.slice(-4) ??
            null)
          : null,
    },
    update: {
      provider: body.provider,
      model: DEFAULT_AI_MODEL,
      enabled: body.enabled,
      ...keyFields,
    },
  });
  return getAiSettings();
}

export async function getAiUsage() {
  const [totals, count, recent] = await Promise.all([
    prisma.aiUsage.aggregate({ _sum: { costMicros: true } }),
    prisma.aiUsage.count(),
    prisma.aiUsage.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        requestId: true,
        model: true,
        status: true,
        inputTokens: true,
        outputTokens: true,
        costMicros: true,
        createdAt: true,
      },
    }),
  ]);
  const usedMicros = totals._sum.costMicros ?? 0;
  const capMicros = budgetMicros();
  return {
    budgetUsd: env.AI_BUDGET_USD,
    usedUsd: usd(usedMicros),
    remainingUsd: usd(Math.max(0, capMicros - usedMicros)),
    requestCount: count,
    recent: recent.map(({ costMicros, ...row }) => ({
      ...row,
      estimatedCostUsd: usd(costMicros),
    })),
  };
}
