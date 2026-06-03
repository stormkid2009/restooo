import { Prisma } from "@prisma/client";

export class AuditLogger {
  static async log(
    tx: Prisma.TransactionClient,
    params: {
      entity: string;
      entityId: string;
      action: "CREATE" | "UPDATE" | "DELETE" | "UPDATE_STATUS";
      details?: any;
      userId?: string;
      restaurantId: string;
    }
  ) {
    try {
      await tx.auditLog.create({
        data: {
          entity: params.entity,
          entityId: params.entityId,
          action: params.action,
          details: params.details ? JSON.parse(JSON.stringify(params.details)) : null,
          userId: params.userId || null,
          restaurantId: params.restaurantId,
        },
      });
    } catch (error) {
      console.error("Failed to write audit log:", error);
      // We log but do not throw, as we don't want audit log failures to crash the transaction unnecessarily.
      // However, if strict auditing is required, we should throw.
    }
  }
}
