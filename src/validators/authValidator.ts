// src/validators/authValidator.ts
import { z } from "zod";

/**
 * Base User Schema
 * Contains common fields used across different auth operations
 */
const baseUserSchema = z.object({
  email: z
    .string({
      required_error: "Email is required",
      invalid_type_error: "Email must be a string",
    })
    .email({
      message: "Invalid email format",
    }),

  password: z
    .string({
      required_error: "Password is required",
      invalid_type_error: "Password must be a string",
    })
    .min(6, {
      message: "Password must be at least 6 characters long",
    }),
});

/**
 * Register Schema
 * Extends base schema with additional fields needed for registration
 */
export const registerSchema = baseUserSchema.extend({
  name: z
    .string({
      required_error: "Name is required",
      invalid_type_error: "Name must be a string",
    })
    .min(2, {
      message: "Name must be at least 2 characters long",
    }),

  role: z
    .enum(["ADMIN", "MANAGER", "STAFF", "CHEF"], {
      errorMap: () => ({
        message: "Role must be one of: ADMIN, MANAGER, STAFF, or CHEF",
      }),
    })
    .optional(),
});

/**
 * Login Schema
 * Uses base schema (email + password only)
 */
export const loginSchema = baseUserSchema;

/**
 * TypeScript Types
 * Inferred from schemas for use in controllers and services
 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Example usage in controller:
 *
 * import { RegisterInput } from '../validators/authValidator';
 *
 * const createUser = (data: RegisterInput) => {
 *   // data is fully typed!
 *   console.log(data.email, data.password, data.name, data.role);
 * }
 */
