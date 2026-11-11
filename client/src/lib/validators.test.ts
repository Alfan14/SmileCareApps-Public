import { describe, expect, it } from "vitest";
import { contactSchema, loginSchema, registerSchema } from "./validators";

const validContact = { name: "Priya Sharma", email: "priya@example.com", message: "I would like to ask about whitening." };

describe("contactSchema", () => {
  it("accepts a valid message", () => {
    expect(contactSchema.safeParse(validContact).success).toBe(true);
  });
  it("rejects a bad email", () => {
    expect(contactSchema.safeParse({ ...validContact, email: "nope" }).success).toBe(false);
  });
  it("rejects a short message", () => {
    expect(contactSchema.safeParse({ ...validContact, message: "hi" }).success).toBe(false);
  });
  it("rejects letters in the phone number", () => {
    expect(contactSchema.safeParse({ ...validContact, phone: "abc" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts an email and a password", () => {
    expect(loginSchema.safeParse({ email: " priya@example.com ", password: "x" }).success).toBe(true);
  });
  it("requires both fields", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = { name: "Priya Sharma", email: "priya@example.com", password: "Secret123", confirmPassword: "Secret123" };

  it("accepts valid details", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects short, letter-less or digit-less passwords", () => {
    for (const password of ["Ab1", "12345678", "onlyletters"]) {
      expect(registerSchema.safeParse({ ...valid, password, confirmPassword: password }).success).toBe(false);
    }
  });
  it("rejects mismatching confirmation", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "Different1" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
