// src/modules/employee/employee.schema.ts
import { z } from "zod";

/**
 * Create Employee Schema
 * Used by ADMIN to create new employees
 */
export const createEmployeeSchema = z.object({
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

  phone: z.string().optional(),

  role: z.enum(["ADMIN", "MANAGER", "STAFF", "CHEF"], {
    error: "Role must be ADMIN, MANAGER, STAFF, or CHEF",
  }).optional().default("STAFF"),

  shift: z.string().optional(),

  restaurantId: z.string().uuid({ error: "Invalid restaurant ID format" }).optional(),

  active: z.boolean().optional(),
});

/**
 * Update Employee Schema
 * All fields optional for partial updates
 */
export const updateEmployeeSchema = z.object({
  email: z
    .string()
    .email({ error: "Invalid email format" })
    .optional(),

  name: z
    .string()
    .min(2, { error: "Name must be at least 2 characters long" })
    .optional(),

  phone: z.string().optional(),

  role: z
    .enum(["ADMIN", "MANAGER", "STAFF", "CHEF"], {
      error: "Role must be ADMIN, MANAGER, STAFF, or CHEF",
    })
    .optional(),

  shift: z.string().optional(),

  active: z.boolean().optional(),
});

/**
 * Query/Filter Schema for listing employees
 */
export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  role: z.enum(["ADMIN", "MANAGER", "STAFF", "CHEF"], {
    error: "Role must be ADMIN, MANAGER, STAFF, or CHEF",
  }).optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().optional(), // Search by name or email
  sortBy: z.enum(["name", "email", "createdAt", "role"], {
    error: "Sort by must be name, email, createdAt, or role",
  }).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"], {
    error: "Sort order must be asc or desc",
  }).optional().default("desc"),
});

/**
 * Employee ID Param Schema
 */
export const employeeIdSchema = z.object({
  id: z.string().uuid({ error: "Invalid employee ID format" }),
});

/**
 * Admin Password Reset Schema
 * Used by ADMIN to reset employee passwords (no current password required)
 */
export const adminResetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(1, { error: "Password is required" })
    .min(6, { error: "Password must be at least 6 characters long" }),
});

// TypeScript Types
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeQueryInput = z.infer<typeof employeeQuerySchema>;
export type EmployeeIdInput = z.infer<typeof employeeIdSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

// Employee Response Type (excludes password)
export interface EmployeeResponse {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  shift: string | null;
  hireDate: Date;
  active: boolean;
  restaurantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}