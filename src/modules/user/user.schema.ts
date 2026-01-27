// src/features/user/user.schema.ts
import { z } from "zod";

/**
 * Email validation regex (RFC 5322 compliant)
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * UUID validation regex (v4)
 */
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Create User Schema
 * Used by ADMIN to create new users
 */
export const createUserSchema = z.object({
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

  role: z.enum(["ADMIN", "MANAGER", "STAFF", "CHEF"], {
    message: "Role must be ADMIN, MANAGER, STAFF, or CHEF",
  }),

  active: z.boolean().optional(),
});

/**
 * Update User Schema
 * All fields optional for partial updates
 */
export const updateUserSchema = z.object({
  email: z
    .string()
    .refine((val) => emailRegex.test(val), {
      message: "Invalid email format",
    })
    .optional(),

  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .optional(),

  role: z
    .enum(["ADMIN", "MANAGER", "STAFF", "CHEF"], {
      message: "Role must be ADMIN, MANAGER, STAFF, or CHEF",
    })
    .optional(),

  active: z.boolean().optional(),
});

/**
 * Update Profile Schema
 * Users updating their own profile (limited fields)
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .optional(),

  email: z
    .string()
    .refine((val) => emailRegex.test(val), {
      message: "Invalid email format",
    })
    .optional(),
});

/**
 * Query/Filter Schema
 */
export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  role: z.enum(["ADMIN", "MANAGER", "STAFF", "CHEF"], {
    message: "Role must be ADMIN, MANAGER, STAFF, or CHEF",
  }).optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().optional(), // Search by name or email
  sortBy: z.enum(["name", "email", "createdAt", "role"], {
    message: "Sort by must be name, email, createdAt, or role",
  }).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"], {
    message: "Sort order must be asc or desc",
  }).optional().default("desc"),
});

/**
 * User ID Param Schema
 */
export const userIdSchema = z.object({
  id: z.string().refine((val) => uuidRegex.test(val), {
    message: "Invalid user ID format",
  }),
});

// TypeScript Types
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type UserIdInput = z.infer<typeof userIdSchema>;

// User Response Type (reusable across features)
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}