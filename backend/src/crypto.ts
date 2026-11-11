// TARGET: server/src/utils/crypto.ts
// AES-256-GCM for the AI API key saved from the owner dashboard.
// Generate APP_ENCRYPTION_KEY once:  openssl rand -base64 32
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { env } from "../config/env";

const key = Buffer.from(env.APP_ENCRYPTION_KEY, "base64");     // 32 bytes

export type Encrypted = { encryptedKey: string; iv: string; authTag: string };

export function encrypt(plain: string): Encrypted {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    encryptedKey: data.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decrypt(p: Encrypted): string {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(p.iv, "base64"));
  decipher.setAuthTag(Buffer.from(p.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(p.encryptedKey, "base64")), decipher.final()]).toString("utf8");
}

export const last4 = (s: string) => s.slice(-4);

// Unit test idea: decrypt(encrypt("abc")) === "abc"; tampering with authTag must throw.
