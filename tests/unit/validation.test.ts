import { describe, expect, it } from "vitest";
import { loginSchema, resetPasswordSchema } from "@/features/auth/validation";

describe("auth validation", () => {
  it("validates login input", () => {
    expect(loginSchema.safeParse({ email: "student@example.com", password: "password" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "bad", password: "" }).success).toBe(false);
  });

  it("validates matching reset passwords", () => {
    expect(resetPasswordSchema.safeParse({ password: "password123", confirmPassword: "password123" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "password123", confirmPassword: "different123" }).success).toBe(false);
  });
});
