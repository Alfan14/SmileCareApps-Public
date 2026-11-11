import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env";
import { HttpError } from "../middleware/errors";

export type EncryptedSecret = { encryptedKey: string; iv: string; authTag: string };

function getEncryptionKey(): Buffer {
  const value = env.APP_ENCRYPTION_KEY;
  if (!value) {
    throw new HttpError(503, "AI_ENCRYPTION_NOT_CONFIGURED", "APP_ENCRYPTION_KEY is required to store API keys securely");
  }
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new HttpError(503, "AI_ENCRYPTION_NOT_CONFIGURED", "APP_ENCRYPTION_KEY must be base64-encoded 32 bytes");
  }
  return key;
}

export function encryptSecret(value: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    encryptedKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(value: EncryptedSecret): string {
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(value.encryptedKey, "base64")), decipher.final()]).toString("utf8");
}
