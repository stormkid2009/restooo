import { z } from "zod";

/**
 * Order Type & Status Enums
 */
const orderTypeEnum = z.enum(["DINE_IN", "TAKEOUT", "DELIVERY"]);
const orderStatusEnum = z.enum([
  "PENDING",
  "PREPARING",
  "READY",
  "SERVED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]);

/**
 * Order Item Schema
 */
const orderItemSchema = z.object({
  menuItemId: z.string().uuid("Invalid physical menu item ID"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  specialInstructions: z.string().optional(),
});

/**
 * Create Order Schema
 */
export const createOrderSchema = z.object({
  tableId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  orderType: orderTypeEnum.default("DINE_IN"),

  // Items
  items: z.array(orderItemSchema).min(1, "Order must contain at least one item"),

  // Pricing Modifiers (Subtotal and Total calculated by service)
  // Default values passed according to local rules (e.g., 14% tax)
  tax: z.number().min(0).default(0.14), // 14% tax by default
  tip: z.number().min(0).default(0),    // 0 tip by default
  
  // Delivery Specific
  deliveryAddress: z.string().optional(),
  deliveryFee: z.number().min(0).default(0), // 0 delivery fee by default
}).refine((data) => {
  // If delivery, address is practically required
  if (data.orderType === "DELIVERY" && !data.deliveryAddress) {
    return false;
  }
  return true;
}, {
  message: "deliveryAddress is required for DELIVERY orders",
  path: ["deliveryAddress"],
}).refine((data) => {
  // If dine-in, maybe tableId is good (but we won't strictly enforce it here because staff might create it first)
  return true;
});

/**
 * Update Order Schema
 */
export const updateOrderSchema = z.object({
  orderType: orderTypeEnum.optional(),
  tax: z.number().min(0).optional(),
  tip: z.number().min(0).optional(),
  deliveryAddress: z.string().optional(),
  deliveryFee: z.number().min(0).optional(),
});

/**
 * Update Order Status Schema
 */
export const updateOrderStatusSchema = z.object({
  status: orderStatusEnum,
});

/**
 * List Orders Query Schema
 */
export const listOrderSchema = z.object({
  status: orderStatusEnum.optional(),
  orderType: orderTypeEnum.optional(),
  tableId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

/**
 * Types
 */
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type ListOrderQuery = z.infer<typeof listOrderSchema>;
