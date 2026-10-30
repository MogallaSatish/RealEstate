import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z.string().min(2).max(80),
    email: z.string().email(),
    mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    password: z.string().min(8).max(72),
    confirmPassword: z.string(),
    role: z.enum(["buyer", "tenant", "owner", "agent"]),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotSchema = z.object({ email: z.string().email() });
export const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});
export const verifySchema = z.object({ token: z.string().min(10) });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
