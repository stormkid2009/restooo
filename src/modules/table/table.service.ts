// src/modules/table/table.service.ts
import prisma from "../../config/database";
import { CreateTableInput, UpdateTableInput, UpdateTableStatusInput, ListTableQuery } from "./table.schema";

/**
 * Service Response Type
 * Consistent response structure for all service methods
 */
type ServiceResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: number };

/**
 * Table Service Class
 *
 * Handles all table-related business logic:
 * - Create tables (scoped to restaurant, ensures unique table number per restaurant)
 * - List tables with filters (scoped to restaurant)
 * - Get single table
 * - Update tables attributes
 * - Update table status
 * - Delete tables (soft delete via deletedAt)
 */
class TableService {
  /**
   * Create a new table
   * Requires restaurantId for multi-tenancy and unique validation
   *
   * @param data - Validated table data
   * @param restaurantId - Restaurant ID for scoping
   * @returns ServiceResponse with created table
   */
  async create(data: CreateTableInput, restaurantId: string): Promise<ServiceResponse<any>> {
    try {
      // Ensure the table number is unique for this specific restaurant
      const existingTableWithNumber = await prisma.table.findFirst({
        where: {
          restaurantId,
          number: data.number,
          deletedAt: null // Consider both active and logically active if not using hard delete for cleanup
        }
      });

      if (existingTableWithNumber) {
        return {
          success: false,
          error: `Table number ${data.number} already exists in this restaurant`,
          code: 409
        };
      }

      const table = await prisma.table.create({
        data: {
          number: data.number,
          capacity: data.capacity,
          location: data.location,
          status: data.status,
          restaurantId: restaurantId,
        },
      });

      return {
        success: true,
        data: table,
      };
    } catch (error) {
      console.error("Create table error:", error);
      return {
        success: false,
        error: "Failed to create table",
        code: 500
      };
    }
  }

  /**
   * List tables with filters
   * Scoped to restaurant for multi-tenancy
   *
   * @param filters - Query filters
   * @param restaurantId - Restaurant ID for scoping
   * @returns ServiceResponse with items
   */
  async list(
    filters: ListTableQuery,
    restaurantId: string,
  ): Promise<ServiceResponse<any[]>> {
    try {
      // Build dynamic where clause
      const where: any = {
        restaurantId,
        deletedAt: null,
      };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.location) {
        where.location = filters.location;
      }

      if (filters.minCapacity !== undefined) {
        where.capacity = {
          gte: filters.minCapacity,
        };
      }

      const items = await prisma.table.findMany({
        where,
        orderBy: { number: "asc" },
      });

      return {
        success: true,
        data: items,
      };
    } catch (error) {
      console.error("List tables error:", error);
      return {
        success: false,
        error: "Failed to fetch tables",
        code: 500
      };
    }
  }

  /**
   * Get single table by ID
   *
   * @param id - Table UUID
   * @param restaurantId - Restaurant ID for ownership verification
   * @returns ServiceResponse with table or error
   */
  async getById(id: string, restaurantId: string): Promise<ServiceResponse<any>> {
    try {
      const table = await prisma.table.findFirst({
        where: { id, restaurantId, deletedAt: null },
      });

      if (!table) {
        return {
          success: false,
          error: "Table not found",
          code: 404
        };
      }

      return {
        success: true,
        data: table,
      };
    } catch (error) {
      console.error("Get table error:", error);
      return {
        success: false,
        error: "Failed to fetch table",
        code: 500
      };
    }
  }

  /**
   * Update table attributes (partial update, excl. status)
   * Verifies restaurant ownership and number uniqueness before update
   *
   * @param id - Table UUID
   * @param data - Fields to update
   * @param restaurantId - Restaurant ID for ownership verification
   * @returns ServiceResponse with updated table
   */
  async update(
    id: string,
    data: UpdateTableInput,
    restaurantId: string,
  ): Promise<ServiceResponse<any>> {
    try {
      const existing = await prisma.table.findFirst({
        where: { id, restaurantId, deletedAt: null },
      });

      if (!existing) {
        return {
          success: false,
          error: "Table not found",
          code: 404
        };
      }

      // If updating table number, ensure it doesn't conflict
      if (data.number !== undefined && data.number !== existing.number) {
        const conflictingTable = await prisma.table.findFirst({
          where: { restaurantId, number: data.number, deletedAt: null }
        });

        if (conflictingTable) {
           return {
             success: false,
             error: `Table number ${data.number} already exists in this restaurant`,
             code: 409
           };
        }
      }

      const updatedTable = await prisma.table.update({
        where: { id },
        data,
      });

      return {
        success: true,
        data: updatedTable,
      };
    } catch (error) {
      console.error("Update table error:", error);
      return {
        success: false,
        error: "Failed to update table attributes",
        code: 500
      };
    }
  }

  /**
   * Update table status
   * Fast, specialized method for staff
   *
   * @param id - Table UUID
   * @param data - Status to update to
   * @param restaurantId - Restaurant ID for ownership verification
   * @returns ServiceResponse with updated table
   */
  async updateStatus(
    id: string,
    data: UpdateTableStatusInput,
    restaurantId: string,
  ): Promise<ServiceResponse<any>> {
    try {
      const existing = await prisma.table.findFirst({
        where: { id, restaurantId, deletedAt: null },
      });

      if (!existing) {
        return {
          success: false,
          error: "Table not found",
          code: 404
        };
      }

      const updatedTable = await prisma.table.update({
        where: { id },
        data: { status: data.status },
      });

      return {
        success: true,
        data: updatedTable,
      };
    } catch (error) {
      console.error("Update table status error:", error);
      return {
        success: false,
        error: "Failed to update table status",
        code: 500
      };
    }
  }

  /**
   * Delete table (soft delete via deletedAt)
   * Verifies restaurant ownership before delete
   *
   * @param id - Table UUID
   * @param restaurantId - Restaurant ID for ownership verification
   * @returns ServiceResponse with success or error
   */
  async delete(id: string, restaurantId: string): Promise<ServiceResponse<void>> {
    try {
      const existing = await prisma.table.findFirst({
        where: { id, restaurantId, deletedAt: null },
      });

      if (!existing) {
        return {
          success: false,
          error: "Table not found",
          code: 404
        };
      }

      await prisma.table.update({
        where: { id },
        data: { deletedAt: new Date(), status: "MAINTENANCE" }, // optionally set to maintenance so it's clearly inactive in logs
      });

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      console.error("Delete table error:", error);
      return {
        success: false,
        error: "Failed to delete table",
        code: 500
      };
    }
  }
}

// Export singleton instance
export default new TableService();
