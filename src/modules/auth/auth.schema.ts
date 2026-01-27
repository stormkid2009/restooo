// src/modules/auth/auth.schema.ts
import { z } from "zod";

/**
 * Email validation regex (RFC 5322 compliant)
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Login Schema
 * Only email and password needed for authentication
 */
export const loginSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .min(1, { message: "Email cannot be empty" })
    .refine((val) => emailRegex.test(val), {
      message: "Invalid email format",
    }),

  password: z
    .string({ message: "Password is required" })
    .min(1, { message: "Password cannot be empty" }),
});

/**
 * Register Schema
 * Basic info needed to create account
 * User service will handle full user creation
 */
export const registerSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .min(1, { message: "Email cannot be empty" })
    .refine((val) => emailRegex.test(val), {
      message: "Invalid email format",
    }),

  password: z
    .string({ message: "Password is required" })
    .min(1, { message: "Password cannot be empty" })
    .min(6, { message: "Password must be at least 6 characters long" }),

  name: z
    .string({ message: "Name is required" })
    .min(1, { message: "Name cannot be empty" })
    .min(2, { message: "Name must be at least 2 characters long" }),

  role: z
    .enum(["ADMIN", "MANAGER", "STAFF", "CHEF"], {
      message: "Role must be one of: ADMIN, MANAGER, STAFF, or CHEF",
    })
    .optional()
    .default("STAFF"),
});

/**
 * Forgot Password Schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .min(1, { message: "Email cannot be empty" })
    .refine((val) => emailRegex.test(val), {
      message: "Invalid email format",
    }),
});

/**
 * Reset Password Schema
 */
export const resetPasswordSchema = z.object({
  token: z
    .string({ message: "Reset token is required" })
    .min(1, { message: "Reset token is required" }),
  newPassword: z
    .string({ message: "Password is required" })
    .min(1, { message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters long" }),
});

/**
 * Change Password Schema (for authenticated users)
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ message: "Current password is required" })
    .min(1, { message: "Current password is required" }),
  newPassword: z
    .string({ message: "New password is required" })
    .min(1, { message: "New password is required" })
    .min(6, { message: "New password must be at least 6 characters long" }),
});

/**
 * Refresh Token Schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ message: "Refresh token is required" })
    .min(1, { message: "Refresh token is required" }),
});

// TypeScript Types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

