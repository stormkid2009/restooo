// src/modules/auth/auth.schema.ts
import { z } from "zod";



/**
 * Login Schema
 * Only email and password needed for authentication
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { error: "Email is required" })
    .email({ error: "Invalid email format" }),

  password: z
    .string()
    .min(1, { error: "Password is required" }),
});

/**
 * Register Schema
 * Basic info needed to create account
 * User service will handle full user creation
 */
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, { error: "Email is required" })
    .email({ error: "Invalid email format" }),

  password: z
    .string()
    .min(1, { error: "Password is required" })
    .min(6, { error: "Password must be at least 6 characters long" }),

  name: z
    .string()
    .min(1, { error: "Name is required" })
    .min(2, { error: "Name must be at least 2 characters long" }),

  role: z
    .enum(["ADMIN", "MANAGER", "STAFF", "CHEF"], {
      error: "Role must be one of: ADMIN, MANAGER, STAFF, or CHEF",
    })
    .optional()
    .default("STAFF"),
});

/**
 * Forgot Password Schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { error: "Email is required" })
    .email({ error: "Invalid email format" }),
});

/**
 * Reset Password Schema
 */
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, { error: "Reset token is required" }),
  newPassword: z
    .string()
    .min(1, { error: "Password is required" })
    .min(6, { error: "Password must be at least 6 characters long" }),
});

/**
 * Change Password Schema (for authenticated users)
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { error: "Current password is required" }),
  newPassword: z
    .string()
    .min(1, { error: "New password is required" })
    .min(6, { error: "New password must be at least 6 characters long" }),
});

/**
 * Refresh Token Schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, { error: "Refresh token is required" }),
});

// TypeScript Types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

