import prisma from "../../config/database";
import { CreateReservationInput, UpdateReservationInput, UpdateReservationStatusInput, GetReservationsQueryInput } from "./reservation.schema";

type ServiceResponse<T> =
  | { success: true; data: T; meta?: any }
  | { success: false; error: string; code?: number };

class ReservationService {
  private getDurationMs(): number {
    const minutes = Number(process.env.DEFAULT_RESERVATION_DURATION_MINUTES) || 120;
    return minutes * 60 * 1000;
  }

  private async checkTableConflict(
    tx: any, // Prisma client or transaction client
    tableId: string,
    scheduledAt: Date,
    restaurantId: string,
    excludeReservationId?: string
  ): Promise<boolean> {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + this.getDurationMs());

    const where: any = {
      tableId,
      restaurantId,
      deletedAt: null,
      status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
      scheduledAt: {
        gte: start,
        lt: end,
      },
    };

    if (excludeReservationId) {
      where.id = { not: excludeReservationId };
    }

    const conflicting = await tx.reservation.findFirst({
      where,
    });

    return !!conflicting;
  }

  async create(data: CreateReservationInput, restaurantId: string): Promise<ServiceResponse<any>> {
    try {
      if (!data.customerId && !data.guestName) {
        return {
          success: false,
          error: "Either customerId or guestName is required",
          code: 400,
        };
      }

      const scheduledAtDate = new Date(data.scheduledAt);

      // Use a transaction for table availability check and creation
      const result = await prisma.$transaction(async (tx) => {
        if (data.tableId) {
          const table = await tx.table.findFirst({
            where: { id: data.tableId, restaurantId, deletedAt: null },
          });

          if (!table) {
            throw new Error("Table not found");
          }

          if (data.partySize > table.capacity) {
            throw new Error(`Table capacity (${table.capacity}) is less than party size (${data.partySize})`);
          }

          const hasConflict = await this.checkTableConflict(tx, data.tableId, scheduledAtDate, restaurantId);
          if (hasConflict) {
            throw new Error("Table is already reserved for the requested time slot");
          }
        }

        return await tx.reservation.create({
          data: {
            customerId: data.customerId,
            guestName: data.guestName,
            guestPhone: data.guestPhone,
            tableId: data.tableId,
            scheduledAt: scheduledAtDate,
            partySize: data.partySize,
            status: data.status,
            specialRequests: data.specialRequests,
            restaurantId,
          },
          include: { table: true, customer: true },
        });
      });

      return { success: true, data: result };
    } catch (error: any) {
      console.error("Create reservation error:", error);
      if (error.message === "Table not found") return { success: false, error: error.message, code: 404 };
      if (error.message.startsWith("Table capacity") || error.message.startsWith("Table is already")) {
        return { success: false, error: error.message, code: 409 };
      }
      return { success: false, error: "Failed to create reservation", code: 500 };
    }
  }

  async list(
    filters: GetReservationsQueryInput,
    restaurantId: string,
  ): Promise<ServiceResponse<any[]>> {
    try {
      const where: any = { restaurantId, deletedAt: null };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.scheduledAt = {};
        if (filters.dateFrom) {
          where.scheduledAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.scheduledAt.lte = new Date(filters.dateTo);
        }
      }

      if (filters.customerId) {
        where.customerId = filters.customerId;
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const [items, totalCount] = await prisma.$transaction([
        prisma.reservation.findMany({
          where,
          include: { table: true, customer: true },
          orderBy: { scheduledAt: "asc" },
          skip,
          take: limit,
        }),
        prisma.reservation.count({ where }),
      ]);

      return {
        success: true,
        data: items,
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error("List reservations error:", error);
      return { success: false, error: "Failed to fetch reservations", code: 500 };
    }
  }

  async getById(id: string, restaurantId: string): Promise<ServiceResponse<any>> {
    try {
      const reservation = await prisma.reservation.findFirst({
        where: { id, restaurantId, deletedAt: null },
        include: { table: true, customer: true },
      });

      if (!reservation) {
        return { success: false, error: "Reservation not found", code: 404 };
      }

      return { success: true, data: reservation };
    } catch (error) {
      console.error("Get reservation error:", error);
      return { success: false, error: "Failed to fetch reservation", code: 500 };
    }
  }

  async update(
    id: string,
    data: UpdateReservationInput,
    restaurantId: string,
  ): Promise<ServiceResponse<any>> {
    try {
      // Use transaction to ensure consistency
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.reservation.findFirst({
          where: { id, restaurantId, deletedAt: null },
        });

        if (!existing) {
          throw new Error("Reservation not found");
        }

        if (existing.status !== "PENDING" && existing.status !== "CONFIRMED") {
          throw new Error("Can only update pending or confirmed reservations");
        }

        const tableId = data.tableId || existing.tableId;
        const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : existing.scheduledAt;
        const partySize = data.partySize || existing.partySize;

        if (tableId) {
          const table = await tx.table.findFirst({
            where: { id: tableId, restaurantId, deletedAt: null },
          });

          if (!table) {
            throw new Error("Table not found");
          }

          if (partySize > table.capacity) {
            throw new Error(`Table capacity (${table.capacity}) is less than party size (${partySize})`);
          }

          if (data.scheduledAt || data.tableId) {
            const hasConflict = await this.checkTableConflict(tx, tableId, scheduledAt, restaurantId, id);
            if (hasConflict) {
               throw new Error("Table is already reserved for the requested time slot");
            }
          }
        }

        const updateData: any = { ...data };
        if (data.scheduledAt) {
          updateData.scheduledAt = scheduledAt;
        }

        return await tx.reservation.update({
          where: { id },
          data: updateData,
          include: { table: true, customer: true },
        });
      });

      return { success: true, data: result };
    } catch (error: any) {
      console.error("Update reservation error:", error);
      if (error.message === "Reservation not found" || error.message === "Table not found") {
         return { success: false, error: error.message, code: 404 };
      }
      if (error.message.startsWith("Can only update") || error.message.startsWith("Table capacity") || error.message.startsWith("Table is already")) {
         return { success: false, error: error.message, code: 400 };
      }
      return { success: false, error: "Failed to update reservation", code: 500 };
    }
  }

  async updateStatus(
    id: string,
    data: UpdateReservationStatusInput,
    restaurantId: string,
  ): Promise<ServiceResponse<any>> {
    try {
      const existing = await prisma.reservation.findFirst({
        where: { id, restaurantId, deletedAt: null },
      });

      if (!existing) {
        return { success: false, error: "Reservation not found", code: 404 };
      }

      const validTransitions: Record<string, string[]> = {
        PENDING: ["CONFIRMED", "CANCELLED"],
        CONFIRMED: ["SEATED", "CANCELLED", "NO_SHOW"],
        SEATED: ["COMPLETED", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: [],
        NO_SHOW: [],
      };

      const allowed = validTransitions[existing.status];
      if (!allowed || !allowed.includes(data.status)) {
        return {
          success: false,
          error: `Cannot transition from ${existing.status} to ${data.status}`,
          code: 400,
        };
      }

      const updated = await prisma.reservation.update({
        where: { id },
        data: { status: data.status },
        include: { table: true, customer: true },
      });

      return { success: true, data: updated };
    } catch (error) {
      console.error("Update reservation status error:", error);
      return { success: false, error: "Failed to update reservation status", code: 500 };
    }
  }

  async delete(id: string, restaurantId: string): Promise<ServiceResponse<void>> {
    try {
      const existing = await prisma.reservation.findFirst({
        where: { id, restaurantId, deletedAt: null },
      });

      if (!existing) {
        return { success: false, error: "Reservation not found", code: 404 };
      }

      await prisma.reservation.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return { success: true, data: undefined };
    } catch (error) {
      console.error("Delete reservation error:", error);
      return { success: false, error: "Failed to delete reservation", code: 500 };
    }
  }

  async checkAvailability(
    tableId: string,
    scheduledAt: string,
    restaurantId: string,
  ): Promise<ServiceResponse<{ available: boolean }>> {
    try {
      const table = await prisma.table.findFirst({
        where: { id: tableId, restaurantId, deletedAt: null },
      });

      if (!table) {
        return { success: false, error: "Table not found", code: 404 };
      }

      const hasConflict = await this.checkTableConflict(prisma, tableId, new Date(scheduledAt), restaurantId);

      return {
        success: true,
        data: { available: !hasConflict },
      };
    } catch (error) {
      console.error("Check availability error:", error);
      return { success: false, error: "Failed to check availability", code: 500 };
    }
  }
}

export default new ReservationService();
