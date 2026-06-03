import prisma from "../../config/database";
import { CreateReservationInput, UpdateReservationInput, UpdateReservationStatusInput, GetReservationsQueryInput } from "./reservation.schema";
import { Prisma, Reservation } from "@prisma/client";
import { AppError, NotFoundError, ConflictError, BadRequestError } from "../../utils/errors";
import { ReservationPolicy } from "./reservation.policy";
import { withRetry } from "../../utils/withRetry";
import { AuditLogger } from "../../utils/auditLogger";

type ServiceResponse<T> =
  | { success: true; data: T; meta?: any }
  | { success: false; error: string; code?: number };

class ReservationService {
  private async checkTableConflict(
    tx: Prisma.TransactionClient,
    tableId: string,
    scheduledAt: Date,
    restaurantId: string,
    excludeReservationId?: string,
    lockTable = true
  ): Promise<boolean> {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + ReservationPolicy.getDurationMs());

    if (lockTable) {
      // Pessimistic Locking: Lock the table row so concurrent transactions wait here
      await tx.$queryRaw`SELECT id FROM tables WHERE id = ${tableId} FOR UPDATE`;
    }

    const where: Prisma.ReservationWhereInput = {
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

  async create(data: CreateReservationInput, restaurantId: string): Promise<ServiceResponse<Reservation>> {
    try {
      if (!data.customerId && !data.guestName) {
        return {
          success: false,
          error: "Either customerId or guestName is required",
          code: 400,
        };
      }

      const scheduledAtDate = new Date(data.scheduledAt);

      const result = await withRetry(() =>
        prisma.$transaction(async (tx) => {
          if (data.tableId) {
            const table = await tx.table.findFirst({
              where: { id: data.tableId, restaurantId, deletedAt: null },
            });

            if (!table) {
              throw new NotFoundError("Table not found");
            }

            if (data.partySize > table.capacity) {
              throw new ConflictError(`Table capacity (${table.capacity}) is less than party size (${data.partySize})`);
            }

            const hasConflict = await this.checkTableConflict(tx, data.tableId, scheduledAtDate, restaurantId);
            if (hasConflict) {
              throw new ConflictError("Table is already reserved for the requested time slot");
            }
          }

          const reservation = await tx.reservation.create({
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

          await AuditLogger.log(tx, {
            entity: "Reservation",
            entityId: reservation.id,
            action: "CREATE",
            userId: data.customerId,
            restaurantId,
            details: { ...data },
          });

          return reservation;
        })
      );

      return { success: true, data: result };
    } catch (error: any) {
      console.error("Create reservation error:", error);
      if (error instanceof AppError) {
        return { success: false, error: error.message, code: error.statusCode };
      }
      return { success: false, error: "Failed to create reservation", code: 500 };
    }
  }

  async list(
    filters: GetReservationsQueryInput,
    restaurantId: string,
  ): Promise<ServiceResponse<Reservation[]>> {
    try {
      const where: Prisma.ReservationWhereInput = { restaurantId, deletedAt: null };

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

      const { items, totalCount } = await prisma.$transaction(async (tx) => {
        const items = await tx.reservation.findMany({
          where,
          include: { table: true, customer: true },
          orderBy: { scheduledAt: "asc" },
          skip,
          take: limit,
        });
        const totalCount = await tx.reservation.count({ where });
        return { items, totalCount };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

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

  async getById(id: string, restaurantId: string): Promise<ServiceResponse<Reservation>> {
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
  ): Promise<ServiceResponse<Reservation>> {
    try {
      const result = await withRetry(() =>
        prisma.$transaction(async (tx) => {
          const existing = await tx.reservation.findFirst({
            where: { id, restaurantId, deletedAt: null },
          });

          if (!existing) {
            throw new NotFoundError("Reservation not found");
          }

          if (existing.status !== "PENDING" && existing.status !== "CONFIRMED") {
            throw new BadRequestError("Can only update pending or confirmed reservations");
          }

          const tableId = data.tableId || existing.tableId;
          const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : existing.scheduledAt;
          const partySize = data.partySize ?? existing.partySize;

          if (tableId) {
            const table = await tx.table.findFirst({
              where: { id: tableId, restaurantId, deletedAt: null },
            });

            if (!table) {
              throw new NotFoundError("Table not found");
            }

            if (partySize > table.capacity) {
              throw new ConflictError(`Table capacity (${table.capacity}) is less than party size (${partySize})`);
            }

            if (data.scheduledAt || data.tableId) {
              const hasConflict = await this.checkTableConflict(tx, tableId, scheduledAt, restaurantId, id);
              if (hasConflict) {
                 throw new ConflictError("Table is already reserved for the requested time slot");
              }
            }
          }

          const updateData: Prisma.ReservationUpdateInput = { ...data };
          if (data.scheduledAt) {
            updateData.scheduledAt = scheduledAt;
          }

          const updated = await tx.reservation.update({
            where: { id },
            data: updateData,
            include: { table: true, customer: true },
          });

          await AuditLogger.log(tx, {
            entity: "Reservation",
            entityId: id,
            action: "UPDATE",
            restaurantId,
            details: { ...data },
          });

          return updated;
        })
      );

      return { success: true, data: result };
    } catch (error: any) {
      console.error("Update reservation error:", error);
      if (error instanceof AppError) {
         return { success: false, error: error.message, code: error.statusCode };
      }
      return { success: false, error: "Failed to update reservation", code: 500 };
    }
  }

  async updateStatus(
    id: string,
    data: UpdateReservationStatusInput,
    restaurantId: string,
  ): Promise<ServiceResponse<Reservation>> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.reservation.findFirst({
          where: { id, restaurantId, deletedAt: null },
        });

        if (!existing) {
          throw new NotFoundError("Reservation not found");
        }

        if (!ReservationPolicy.canTransition(existing.status, data.status)) {
          throw new BadRequestError(`Cannot transition from ${existing.status} to ${data.status}`);
        }

        const updated = await tx.reservation.update({
          where: { id },
          data: { status: data.status },
          include: { table: true, customer: true },
        });

        await AuditLogger.log(tx, {
          entity: "Reservation",
          entityId: id,
          action: "UPDATE_STATUS",
          restaurantId,
          details: { from: existing.status, to: data.status },
        });

        return updated;
      });

      return { success: true, data: result };
    } catch (error: any) {
      console.error("Update reservation status error:", error);
      if (error instanceof AppError) {
        return { success: false, error: error.message, code: error.statusCode };
      }
      return { success: false, error: "Failed to update reservation status", code: 500 };
    }
  }

  async delete(id: string, restaurantId: string): Promise<ServiceResponse<void>> {
    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.reservation.findFirst({
          where: { id, restaurantId, deletedAt: null },
        });

        if (!existing) {
          throw new NotFoundError("Reservation not found");
        }

        await tx.reservation.update({
          where: { id },
          data: { deletedAt: new Date() },
        });

        await AuditLogger.log(tx, {
          entity: "Reservation",
          entityId: id,
          action: "DELETE",
          restaurantId,
        });
      });

      return { success: true, data: undefined };
    } catch (error: any) {
      console.error("Delete reservation error:", error);
      if (error instanceof AppError) {
        return { success: false, error: error.message, code: error.statusCode };
      }
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

      // Pass lockTable=false since we don't want to lock for a simple check
      const hasConflict = await this.checkTableConflict(prisma as any, tableId, new Date(scheduledAt), restaurantId, undefined, false);

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
