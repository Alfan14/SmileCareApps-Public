import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "test-session-secret-must-be-at-least-32-chars";
  process.env.APP_ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
});

import { decryptSecret, encryptSecret } from "../../src/utils/ai-crypto";

describe("AI API-key encryption", () => {
  it("encrypts and decrypts a key without storing plaintext", () => {
    const secret = "sk-demo-never-a-real-key-0123456789";
    const encrypted = encryptSecret(secret);
    expect(encrypted.encryptedKey).not.toBe(secret);
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("rejects ciphertext with a tampered authentication tag", () => {
    const encrypted = encryptSecret("sk-demo-never-a-real-key-0123456789");
    expect(() => decryptSecret({ ...encrypted, authTag: Buffer.alloc(16, 1).toString("base64") })).toThrow();
  });
});
