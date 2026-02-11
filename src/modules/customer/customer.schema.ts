
// src/modules/customer/customer.schema.ts
import { z } from "zod";

/**
 * Create Customer Schema
 * Public registration
 */
export const createCustomerSchema = z.object({
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

  phone: z
    .string()
    .min(1, { error: "Phone number is required" }),

  restaurantId: z.string().uuid({ error: "Invalid restaurant ID format" }).optional(),
});

/**
 * Update Customer Schema
 * Profile updates
 */
export const updateCustomerSchema = z.object({
  email: z
    .string()
    .email({ error: "Invalid email format" })
    .optional(),

  name: z
    .string()
    .min(2, { error: "Name must be at least 2 characters long" })
    .optional(),

  phone: z.string().optional(),
});

/**
 * Customer Query Schema
 * Admin listing
 */
export const customerQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  active: z.coerce.boolean().optional(),
  search: z.string().optional(), // Search by name, email, phone
  sortBy: z.enum(["name", "email", "createdAt", "loyaltyPoints"], {
    error: "Sort by must be name, email, createdAt, or loyaltyPoints",
  }).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"], {
    error: "Sort order must be asc or desc",
  }).optional().default("desc"),
});

/**
 * Customer ID Param
 */
export const customerIdSchema = z.object({
  id: z.string().uuid({ error: "Invalid customer ID format" }),
});

// Types
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
export type CustomerIdInput = z.infer<typeof customerIdSchema>;

// Response interface (exclude password)
export interface CustomerResponse {
  id: string;
  email: string;
  name: string;
  phone: string;
  loyaltyPoints: number;
  active: boolean;
  restaurantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
