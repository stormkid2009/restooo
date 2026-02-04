// src/modules/menu/menu.service.ts
import prisma from "../../config/database";
import { CreateMenuInput, UpdateMenuInput, ListMenuQuery } from "./menu.schema";

/**
 * Service Response Type
 * Consistent response structure for all service methods
 */
type ServiceResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Pagination Info Interface
 */
interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Menu Service Class
 *
 * Handles all menu-related business logic:
 * - Create menu items (scoped to restaurant)
 * - List menu items with filters and pagination (scoped to restaurant)
 * - Get single menu item
 * - Update menu items
 * - Delete menu items (soft delete via deletedAt)
 */
class MenuService {
  /**
   * Create a new menu item
   * Requires restaurantId for multi-tenancy
   *
   * @param data - Validated menu item data
   * @param restaurantId - Restaurant ID for scoping
   * @returns ServiceResponse with created menu item
   */
  async create(data: CreateMenuInput, restaurantId: string): Promise<ServiceResponse<any>> {
    try {
      const menuItem = await prisma.menuItem.create({
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          price: data.price,
          available: data.available,
          imageUrl: data.imageUrl,
          allergens: data.allergens,
          prepTimeMinutes: data.prepTimeMinutes,
          restaurantId: restaurantId,
        },
      });

      return {
        success: true,
        data: menuItem,
      };
    } catch (error) {
      console.error("Create menu item error:", error);
      return {
        success: false,
        error: "Failed to create menu item",
      };
    }
  }

  /**
   * List menu items with filters and pagination
   * Scoped to restaurant for multi-tenancy
   *
   * @param filters - Query filters and pagination params
   * @param restaurantId - Restaurant ID for scoping (optional for public menu)
   * @returns ServiceResponse with items and pagination info
   */
  async list(
    filters: ListMenuQuery,
    restaurantId?: string,
  ): Promise<ServiceResponse<{ items: any[]; pagination: PaginationInfo }>> {
    try {
      // Build price filter (combine gte and lte)
      const priceFilter: any = {};
      if (filters.minPrice !== undefined) {
        priceFilter.gte =
          typeof filters.minPrice === "string"
            ? parseFloat(filters.minPrice)
            : filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        priceFilter.lte =
          typeof filters.maxPrice === "string"
            ? parseFloat(filters.maxPrice)
            : filters.maxPrice;
      }

      // Build dynamic where clause
      const where: any = {
        // Restaurant scope (if provided)
        ...(restaurantId && { restaurantId }),

        // Soft delete filter
        deletedAt: null,

        // Category filter
        ...(filters.category && { category: filters.category }),

        // Availability filter
        ...(filters.available !== undefined && {
          available: filters.available,
        }),

        // Price range filter
        ...(Object.keys(priceFilter).length > 0 && { price: priceFilter }),

        // Search filter (case-insensitive name contains)
        ...(filters.search && {
          name: {
            contains: filters.search,
            mode: "insensitive",
          },
        }),
      };

      // Ensure limit and offset are numbers
      const limit =
        typeof filters.limit === "string"
          ? parseInt(filters.limit, 10)
          : filters.limit;
      const offset =
        typeof filters.offset === "string"
          ? parseInt(filters.offset, 10)
          : filters.offset;

      // Get items with pagination
      const items = await prisma.menuItem.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      // Get total count for pagination
      const total = await prisma.menuItem.count({ where });

      // Calculate hasMore
      const hasMore = offset + limit < total;

      return {
        success: true,
        data: {
          items,
          pagination: {
            total,
            limit,
            offset,
            hasMore,
          },
        },
      };
    } catch (error) {
      console.error("List menu items error:", error);
      return {
        success: false,
        error: "Failed to fetch menu items",
      };
    }
  }

  /**
   * Get single menu item by ID
   *
   * @param id - Menu item UUID
   * @param restaurantId - Optional restaurant ID for ownership verification
   * @returns ServiceResponse with menu item or error
   */
  async getById(id: string, restaurantId?: string): Promise<ServiceResponse<any>> {
    try {
      const where: any = { id, deletedAt: null };
      if (restaurantId) {
        where.restaurantId = restaurantId;
      }

      const menuItem = await prisma.menuItem.findFirst({
        where,
      });

      if (!menuItem) {
        return {
          success: false,
          error: "Menu item not found",
        };
      }

      return {
        success: true,
        data: menuItem,
      };
    } catch (error) {
      console.error("Get menu item error:", error);
      return {
        success: false,
        error: "Failed to fetch menu item",
      };
    }
  }

  /**
   * Update menu item (partial update)
   * Verifies restaurant ownership before update
   *
   * @param id - Menu item UUID
   * @param data - Fields to update
   * @param restaurantId - Restaurant ID for ownership verification
   * @returns ServiceResponse with updated menu item
   */
  async update(
    id: string,
    data: UpdateMenuInput,
    restaurantId: string,
  ): Promise<ServiceResponse<any>> {
    try {
      // Check if menu item exists and belongs to the restaurant
      const existing = await prisma.menuItem.findFirst({
        where: { id, restaurantId, deletedAt: null },
      });

      if (!existing) {
        return {
          success: false,
          error: "Menu item not found",
        };
      }

      // Update menu item (only provided fields)
      const updatedItem = await prisma.menuItem.update({
        where: { id },
        data,
      });

      return {
        success: true,
        data: updatedItem,
      };
    } catch (error) {
      console.error("Update menu item error:", error);
      return {
        success: false,
        error: "Failed to update menu item",
      };
    }
  }

  /**
   * Delete menu item (soft delete via deletedAt)
   * Verifies restaurant ownership before delete
   *
   * @param id - Menu item UUID
   * @param restaurantId - Restaurant ID for ownership verification
   * @returns ServiceResponse with success or error
   */
  async delete(id: string, restaurantId: string): Promise<ServiceResponse<void>> {
    try {
      // Check if menu item exists and belongs to the restaurant
      const existing = await prisma.menuItem.findFirst({
        where: { id, restaurantId, deletedAt: null },
      });

      if (!existing) {
        return {
          success: false,
          error: "Menu item not found",
        };
      }

      // Soft delete by setting deletedAt
      await prisma.menuItem.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      console.error("Delete menu item error:", error);
      return {
        success: false,
        error: "Failed to delete menu item",
      };
    }
  }
}

// Export singleton instance
export default new MenuService();
