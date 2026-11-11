import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../middleware/errors";
import {
  getAiSettings,
  getAiUsage,
  sendChat,
  updateAiSettings,
} from "../services/ai.service";
import {
  type AiChatBody,
  type OwnerAiSettingsBody,
} from "../validators/ai.schema";

export async function chat(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json(await sendChat(res.locals.body as AiChatBody));
  } catch (error) {
    next(error);
  }
}

function ensureOwner(req: Request): void {
  if (!req.user?.id) {
    throw new HttpError(401, "UNAUTHENTICATED", "Please log in");
  }

  if (req.user.role !== "OWNER") {
    throw new HttpError(403, "FORBIDDEN", "Owner access required");
  }
}

export async function settings(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    ensureOwner(req);
    res.json({ settings: await getAiSettings() });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    ensureOwner(req);

    res.json({
      settings: await updateAiSettings(
        res.locals.body as OwnerAiSettingsBody,
      ),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Tests the currently saved AI configuration.
 *
 * Uses sendChat() so the test follows the same runtime configuration,
 * provider, API key, enabled-state, and budget checks as normal chat.
 */
export async function testConnection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    ensureOwner(req);

    const result = await sendChat({
      message: "Reply briefly to confirm that the AI assistant is working.",
      history: [],
    });

    res.json({
      ok: true,
      message:
        result.mode === "openai"
          ? "OpenAI connection successful."
          : "Mock AI is responding.",
    });
  } catch (error) {
    next(error);
  }
}

export async function usage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    ensureOwner(req);
    res.json(await getAiUsage());
  } catch (error) {
    next(error);
  }
}