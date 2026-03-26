// src/modules/table/table.schema.ts
import { z } from "zod";

/**
 * Table Status Enum
 * Must match Prisma schema enum
 */
const tableStatusEnum = z.enum([
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "MAINTENANCE",
  "DIRTY",
]);

/**
 * Create Table Schema
 * Validates data for creating new tables
 */
export const createTableSchema = z.object({
  number: z
    .number()
    .int({ error: "Table number must be an integer" })
    .positive({ error: "Table number must be positive" }),

  capacity: z
    .number()
    .int({ error: "Capacity must be an integer" })
    .positive({ error: "Capacity must be a positive number" })
    .min(1, { error: "Capacity must be at least 1" }),

  location: z
    .string()
    .max(100, { error: "Location must be at most 100 characters long" })
    .optional(),

  status: tableStatusEnum.default("AVAILABLE"),
});

/**
 * Update Table Schema
 * Allows partial updates to capacity, number, and location
 */
export const updateTableSchema = createTableSchema.omit({ status: true }).partial();

/**
 * Update Table Status Schema
 * Dedicated schema specifically for changing a table's status
 */
export const updateTableStatusSchema = z.object({
  status: tableStatusEnum,
});

/**
 * List Tables Query Schema
 * Validates query parameters for listing/filtering tables
 */
export const listTableSchema = z.object({
  status: tableStatusEnum.optional(),
  
  minCapacity: z.coerce
    .number()
    .int({ error: "Capacity must be an integer" })
    .positive({ error: "Minimum capacity must be positive" })
    .optional(),

  location: z.string().optional(),
});

/**
 * TypeScript Types
 * Inferred from schemas for use in services and controllers
 */
export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type UpdateTableStatusInput = z.infer<typeof updateTableStatusSchema>;
export type ListTableQuery = z.infer<typeof listTableSchema>;
