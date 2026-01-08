// src/modules/menu/menu.schema.ts
import { z } from "zod";

/**
 * Menu Category Enum
 * Must match Prisma schema enum
 */
const categoryEnum = z.enum([
  "APPETIZER",
  "MAIN_COURSE",
  "DESSERT",
  "BEVERAGE",
  "SIDE_DISH",
]);

/**
 * Create Menu Item Schema
 * Validates data for creating new menu items
 */
export const createMenuSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must be at most 100 characters long"),

  description: z
    .string()
    .max(500, "Description must be at most 500 characters long")
    .optional(),

  category: categoryEnum,

  price: z
    .number()
    .positive("Price must be a positive number")
    .multipleOf(0.01, "Price can have at most 2 decimal places"),

  available: z.boolean().default(true),

  imageUrl: z.string().url("Image URL must be a valid URL").optional(),

  allergens: z.array(z.string()).default([]),

  prepTimeMinutes: z
    .number()
    .int("Prep time must be an integer")
    .positive("Prep time must be positive")
    .default(15),
});

/**
 * Update Menu Item Schema
 * All fields optional (partial update)
 */
export const updateMenuSchema = createMenuSchema.partial();

/**
 * List Menu Items Query Schema
 * Validates query parameters for listing/filtering menu items
 *
 * Note: Query params come as strings, so we use coerce to transform them
 * coerce transform data before validation
 * transform validate data first then transform it
 */
export const listMenuSchema = z
  .object({
    // Filter: Category
    category: categoryEnum.optional(),

    // Filter: Availability
    available: z.coerce.boolean().optional(),

    // Filter: Price range
    minPrice: z.coerce
      .number()
      .positive("Minimum price must be positive")
      .optional(),

    maxPrice: z.coerce
      .number()
      .positive("Maximum price must be positive")
      .optional(),

    // Filter: Search by name
    search: z.string().min(1, "Search query must not be empty").optional(),

    // Pagination
    limit: z.coerce
      .number()
      .int("Limit must be an integer")
      .positive("Limit must be positive")
      .max(100, "Limit cannot exceed 100")
      .default(20),

    offset: z.coerce
      .number()
      .int("Offset must be an integer")
      .min(0, "Offset cannot be negative")
      .default(0),
  })
  .refine(
    (data) => {
      // Validate: maxPrice should be greater than minPrice
      if (data.minPrice && data.maxPrice) {
        return data.maxPrice >= data.minPrice;
      }
      return true;
    },
    {
      message: "Maximum price must be greater than or equal to minimum price",
      path: ["maxPrice"],
    },
  );

/**
 * TypeScript Types
 * Inferred from schemas for use in services and controllers
 */
export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type ListMenuQuery = z.infer<typeof listMenuSchema>;
