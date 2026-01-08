// src/services/menuService.ts
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
 * - Create menu items
 * - List menu items with filters and pagination
 * - Get single menu item
 * - Update menu items
 * - Delete menu items
 */
class MenuService {
  /**
   * Create a new menu item
   *
   * @param data - Validated menu item data
   * @returns ServiceResponse with created menu item
   */
  async create(data: CreateMenuInput): Promise<ServiceResponse<any>> {
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
   *
   * Supports:
   * - Filter by category
   * - Filter by availability
   * - Filter by price range (min/max)
   * - Search by name (case-insensitive)
   * - Pagination (limit/offset)
   *
   * @param filters - Query filters and pagination params
   * @returns ServiceResponse with items and pagination info
   */
  async list(
    filters: ListMenuQuery,
  ): Promise<ServiceResponse<{ items: any[]; pagination: PaginationInfo }>> {
    try {
      // Build price filter (combine gte and lte)
      // Ensure prices are numbers (query params come as strings)
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
        // Category filter
        ...(filters.category && { category: filters.category }),

        // Availability filter (handles true/false/undefined)
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
   * @returns ServiceResponse with menu item or error
   */
  async getById(id: string): Promise<ServiceResponse<any>> {
    try {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id },
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
   *
   * Only provided fields will be updated
   *
   * @param id - Menu item UUID
   * @param data - Fields to update
   * @returns ServiceResponse with updated menu item
   */
  async update(
    id: string,
    data: UpdateMenuInput,
  ): Promise<ServiceResponse<any>> {
    try {
      // Check if menu item exists
      const existing = await prisma.menuItem.findUnique({
        where: { id },
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
   * Delete menu item (hard delete)
   *
   * TODO: Consider implementing soft delete in the future
   * - Add 'deleted' boolean field to MenuItem model
   * - Set deleted = true instead of removing from database
   * - Filter out deleted items in queries by default
   *
   * @param id - Menu item UUID
   * @returns ServiceResponse with success or error
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      // Check if menu item exists
      const existing = await prisma.menuItem.findUnique({
        where: { id },
      });

      if (!existing) {
        return {
          success: false,
          error: "Menu item not found",
        };
      }

      // Hard delete from database
      await prisma.menuItem.delete({
        where: { id },
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
