import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required")
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const ownProfileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email")
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8)
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"]
});

export const ownPasswordSchema = resetPasswordSchema;
