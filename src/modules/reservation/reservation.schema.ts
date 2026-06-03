import { z } from "zod";
/**
 * Reservation Type & Status Enums
 */
const reservationStatusEnum = z.enum([
  "PENDING",
  "CONFIRMED",
  "SEATED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

/**
 * create Reservation Schema
 */
export const createReservationSchema = z.object({
  customerId: z.string().uuid().optional(),
  guestName: z.string().optional(),
  guestPhone: z.string().regex(/^(?:\+20|0)?1[0125]\d{8}$/, "Invalid Egyptian mobile phone number").optional(),
  tableId: z.string().uuid().optional(),
  scheduledAt: z.iso.datetime(),
  partySize: z.number().int().min(1).max(50),
  status: reservationStatusEnum.default("PENDING"),
  specialRequests: z.string().optional(),
}).refine(data => data.customerId || data.guestName, {
  message: "Either customerId or guestName is required",
  path: ["customerId"]
});

/**
 * Update Reservation Schema
 */
export const updateReservationSchema = z.object({
  tableId: z.string().uuid().optional(),
  guestName: z.string().optional(),
  guestPhone: z.string().regex(/^(?:\+20|0)?1[0125]\d{8}$/, "Invalid Egyptian mobile phone number").optional(),
  scheduledAt: z.iso.datetime().optional(),
  partySize: z.number().int().min(1).max(50).optional(),
  specialRequests: z.string().optional(),
});

/**
 * Update Reservation Status Schema
 */

export const updateReservationStatusSchema = z.object({
  status: reservationStatusEnum,
});

/**
 * Get Reservation Query Schema
 */
export const getReservationByIdSchema = z.object({
  reservationId: z.string().uuid(),
});

/**
 * List Reservations Query Schema
 */
export const getReservationsQuerySchema = z.object({
  status: reservationStatusEnum.optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  customerId: z.string().uuid().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(10),
});

/**
 * Check Availability Query Schema
 */
export const checkAvailabilityQuerySchema = z.object({
  tableId: z.string().uuid(),
  scheduledAt: z.iso.datetime(),
});

/**
 * Types
 */
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type UpdateReservationStatusInput = z.infer<
  typeof updateReservationStatusSchema
>;
export type GetReservationByIdInput = z.infer<typeof getReservationByIdSchema>;
export type GetReservationsQueryInput = z.infer<typeof getReservationsQuerySchema>;
export type CheckAvailabilityQueryInput = z.infer<typeof checkAvailabilityQuerySchema>;
