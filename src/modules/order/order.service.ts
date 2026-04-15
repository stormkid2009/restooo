import { customAlphabet } from "nanoid";
import { Prisma } from "@prisma/client";
import { NotFoundError, BadRequestError } from "../../utils/errors";
import prisma from "../../config/database";
import {
  CreateOrderInput,
  UpdateOrderStatusInput,
  ListOrderQuery,
} from "./order.schema";

export class OrderService {
  /**
   * Create a new order for a restaurant.
   *
   * Handles all order types: DINE_IN, TAKEAWAY, and DELIVERY.
   * Prices are fetched fresh from the database at the time of order creation
   * to ensure accuracy, then snapshotted onto each order item.
   *
   * All monetary values are calculated in cents internally to avoid
   * floating-point precision issues, then converted back to decimals before
   * persisting.
   *
   * For DINE_IN orders, the associated table is atomically locked to OCCUPIED
   * within the transaction to prevent race conditions.
   *
   * @param restaurantId - The ID of the restaurant creating the order.
   * @param data         - The order creation payload.
   *   @param data.items           - Line items with menuItemId, quantity, and optional specialInstructions.
   *   @param data.orderType       - One of: DINE_IN, TAKEAWAY, DELIVERY.
   *   @param data.tax             - Tax rate as a multiplier between 0 and 1 (e.g. 0.14 = 14%).
   *   @param data.tip             - Optional tip amount in currency units (e.g. 5.00).
   *   @param data.tableId         - Required for DINE_IN orders.
   *   @param data.customerId      - Optional customer to associate with the order.
   *   @param data.deliveryAddress - Required for DELIVERY orders.
   *   @param data.deliveryFee     - Optional delivery fee in currency units.
   *
   * @returns The created order including its items, table, and customer.
   *
   * @throws {BadRequestError} If any business validation fails (invalid tax rate,
   *   missing table for dine-in, missing address for delivery, negative tip/fee, etc.)
   * @throws {NotFoundError}   If the provided customerId does not exist.
   * @throws {BadRequestError} If one or more menu items are not found or unavailable.
   * @throws {BadRequestError} If the requested table is unavailable or already occupied.
   */
  async createOrder(restaurantId: string, data: CreateOrderInput) {
    const {
      items,
      tableId,
      customerId,
      orderType,
      tax,
      tip,
      deliveryAddress,
      deliveryFee,
    } = data;

    // ─── Step 1: Business validations ────────────────────────────────────────

    if (!items || items.length === 0) {
      throw new BadRequestError("Order must contain at least one item.");
    }

    if (tax < 0 || tax > 1) {
      throw new BadRequestError("Tax rate must be between 0 and 1.");
    }

    if (tip !== undefined && tip < 0) {
      throw new BadRequestError("Tip cannot be negative.");
    }

    if (deliveryFee !== undefined && deliveryFee < 0) {
      throw new BadRequestError("Delivery fee cannot be negative.");
    }

    if (orderType === "DINE_IN" && !tableId) {
      throw new BadRequestError("Table ID is required for dine-in orders.");
    }

    if (orderType === "DELIVERY" && !deliveryAddress) {
      throw new BadRequestError(
        "Delivery address is required for delivery orders.",
      );
    }

    for (const item of items) {
      if (item.quantity < 1) {
        throw new BadRequestError(
          `Quantity must be at least 1 for menu item ${item.menuItemId}.`,
        );
      }
    }

    // ─── Step 2: Fetch and validate menu items ────────────────────────────────
    // Deduplicate IDs before querying to avoid fetching the same item twice
    const uniqueMenuItemIds = [
      ...new Set(items.map((item) => item.menuItemId)),
    ];

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: uniqueMenuItemIds }, restaurantId, deletedAt: null },
    });

    if (menuItems.length !== uniqueMenuItemIds.length) {
      throw new BadRequestError(
        "One or more menu items were not found or not available.",
      );
    }

    // ─── Step 3: Calculate totals in cents ───────────────────────────────────
    // Build a price lookup from fetched menu items
    const itemPrices: Record<string, number> = {};
    menuItems.forEach((mi) => {
      itemPrices[mi.id] = Number(mi.price);
    });

    let subtotalCents = 0;
    const orderItemsRecord: {
      menuItemId: string;
      quantity: number;
      price: number;
      specialInstructions: string | null;
    }[] = [];

    items.forEach((item) => {
      const itemPrice = itemPrices[item.menuItemId];
      const itemPriceCents = Math.round(itemPrice * 100);
      subtotalCents += itemPriceCents * item.quantity;
      orderItemsRecord.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: itemPrice, // Snapshot price at time of order
        specialInstructions: item.specialInstructions || null,
      });
    });

    const taxAmountCents = Math.round(subtotalCents * tax);
    const safeTipCents = Math.round((tip ?? 0) * 100);
    const safeDeliveryFeeCents = Math.round((deliveryFee ?? 0) * 100);
    const computedTotalCents =
      subtotalCents + taxAmountCents + safeTipCents + safeDeliveryFeeCents;

    // ─── Step 4: Generate order number ───────────────────────────────────────
    // nanoid with an unambiguous alphabet (no 0/O, 1/I/L) gives ~1 trillion
    // combinations at 8 chars — collision probability is negligible.
    const generateId = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const orderNumber = `ORD-${datePart}-${generateId()}`;

    // ─── Step 5: Persist order in a transaction ───────────────────────────────
    const order = await prisma.$transaction(async (tx) => {
      // Verify the customer exists if one was provided
      if (customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: customerId, restaurantId, deletedAt: null },
        });
        if (!customer) {
          throw new NotFoundError("Customer not found.");
        }
      }

      // Atomically lock the table to prevent race conditions.
      // updateMany with a status condition ensures only one request
      // can claim an AVAILABLE table at a time.
      if (tableId && orderType === "DINE_IN") {
        const tableUpdate = await tx.table.updateMany({
          where: {
            id: tableId,
            restaurantId,
            status: "AVAILABLE",
            deletedAt: null,
          },
          data: { status: "OCCUPIED" },
        });

        if (tableUpdate.count === 0) {
          throw new BadRequestError(
            "Table is not available, does not exist, or is already occupied.",
          );
        }
      }

      return await tx.order.create({
        data: {
          restaurantId,
          orderNumber,
          tableId,
          customerId,
          orderType,
          subtotal: subtotalCents / 100,
          tax: taxAmountCents / 100,
          tip: safeTipCents / 100,
          deliveryFee: safeDeliveryFeeCents / 100,
          total: computedTotalCents / 100,
          deliveryAddress,
          status: "PENDING",
          items: {
            create: orderItemsRecord,
          },
        },
        include: {
          items: true,
          table: true,
          customer: true,
        },
      });
    });

    return order;
  }
  /**
   * Retrieve a paginated and filtered list of orders for a restaurant.
   *
   * Filtering is applied via the query object — all fields are optional.
   * If no filters are provided, all non-deleted orders are returned.
   *
   * Status and orderType validation is handled upstream by the ListOrderQuery
   * schema and does not need to be re-validated here.
   *
   * @param restaurantId - The restaurant to fetch orders for.
   * @param query        - Optional filters: status, orderType, tableId, customerId.
   * @param page         - Page number for pagination (default: 1).
   * @param limit        - Number of orders per page (default: 10).
   *
   * @returns Paginated orders with meta information (total, page, limit, totalPages).
   */
  async getOrders(
    restaurantId: string,
    query: ListOrderQuery,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      restaurantId,
      deletedAt: null,
      status: query.status ? { equals: query.status } : undefined,
      orderType: query.orderType ? { equals: query.orderType } : undefined,
      tableId: query.tableId ? { equals: query.tableId } : undefined,
      customerId: query.customerId ? { equals: query.customerId } : undefined,
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          table: true,
          customer: true,
          employee: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  /**
   * Get single order by ID
   */
  async getOrderById(restaurantId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId, deletedAt: null },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
        customer: true,
        employee: true,
      },
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    return order;
  }

  /**
   * Update the status of an existing order.
   *
   * Enforces strict status transition rules to ensure orders follow
   * a valid lifecycle. Invalid transitions are rejected before any
   * database interaction occurs.
   *
   * Valid transitions:
   *   PENDING    → PREPARING | CANCELLED
   *   PREPARING  → READY     | CANCELLED
   *   READY      → SERVED    | DELIVERED
   *   SERVED     → COMPLETED
   *   DELIVERED  → COMPLETED
   *
   * Side effects:
   *   - Sets the relevant timestamp field (e.g. acceptedAt, preparedAt) on transition.
   *   - Frees the associated table back to AVAILABLE when order is CANCELLED or COMPLETED.
   *
   * @param restaurantId - The restaurant the order belongs to.
   * @param orderId      - The ID of the order to update.
   * @param data         - Contains the target `status` to transition to.
   *
   * @throws {NotFoundError}    If the order does not exist or belongs to a different restaurant.
   * @throws {BadRequestError}  If the requested status transition is not permitted.
   */
  async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    data: UpdateOrderStatusInput,
  ) {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      PENDING: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY", "CANCELLED"],
      READY: ["SERVED", "DELIVERED"],
      SERVED: ["COMPLETED"],
      DELIVERED: ["COMPLETED"],
    };

    // Step 1: Fetch the current order and verify it belongs to this restaurant
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (
      !currentOrder ||
      currentOrder.restaurantId !== restaurantId ||
      currentOrder.deletedAt
    ) {
      throw new NotFoundError("Order not found.");
    }

    // Step 2: Validate the transition upfront before touching the DB
    // Check what statuses the current order is allowed to move to
    const allowedTransitions = VALID_TRANSITIONS[currentOrder.status] ?? [];

    if (!allowedTransitions.includes(data.status as string)) {
      throw new BadRequestError(
        `Cannot transition from ${currentOrder.status} to ${data.status}. ` +
          `Allowed transitions: ${allowedTransitions.join(", ") || "none"}.`,
      );
    }

    // Step 3: Build the update payload with the relevant timestamp
    const now = new Date();
    const updateData: Prisma.OrderUpdateInput = { status: data.status };

    const statusTimestamps: Record<string, keyof Prisma.OrderUpdateInput> = {
      PREPARING: "acceptedAt",
      READY: "preparedAt",
      SERVED: "servedAt",
      DELIVERED: "deliveredAt",
      COMPLETED: "completedAt",
      CANCELLED: "cancelledAt",
    };

    const timestampField = statusTimestamps[data.status as string];
    if (timestampField) {
      (updateData as any)[timestampField] = now;
    }

    // Step 4: Apply the update and handle table release in a transaction
    try {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.update({
          where: {
            id: orderId,
            restaurantId,
            deletedAt: null,
            status: currentOrder.status, // Optimistic lock: only update if status hasn't changed
          },
          data: updateData,
        });

        // Free the table when the order is resolved (completed or cancelled)
        const isOrderResolved =
          data.status === "COMPLETED" || data.status === "CANCELLED";

        if (isOrderResolved && order.tableId) {
          await tx.table.updateMany({
            where: { id: order.tableId },
            data: { status: "AVAILABLE" },
          });
        }

        return order;
      });

      return updatedOrder;
    } catch (error: unknown) {
      // P2025: Record not found — should be rare given our upfront check,
      // but can happen in a race condition where the order is deleted mid-request
      if (
        typeof error === "object" &&
        error !== null &&
        (error as any).code === "P2025"
      ) {
        throw new NotFoundError(
          "Order status was modified by another request. Please retry.",
        );
      }
      throw error;
    }
  }

  /**
   * Soft delete an order by setting its deletedAt timestamp.
   *
   * Orders that are still active (PENDING, PREPARING, READY) cannot be deleted
   * directly — they must be cancelled first via updateOrderStatus so that any
   * associated table is properly freed back to AVAILABLE.
   *
   * Orders that are already resolved (COMPLETED, CANCELLED, SERVED, DELIVERED)
   * are safe to delete since their table has already been released.
   *
   * @param restaurantId - The restaurant the order belongs to.
   * @param orderId      - The ID of the order to soft delete.
   *
   * @throws {NotFoundError}   If the order does not exist or belongs to a different restaurant.
   * @throws {BadRequestError} If the order is still active and must be cancelled first.
   */
  async deleteOrder(restaurantId: string, orderId: string) {
    // Step 1: Fetch the order and verify it belongs to this restaurant
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId, deletedAt: null },
    });

    if (!order) {
      throw new NotFoundError("Order not found.");
    }

    // Step 2: Block deletion of active orders to prevent orphaned tables.
    // These statuses mean the order is still in progress and may have a
    // table locked as OCCUPIED. The caller must cancel the order first,
    // which will free the table through updateOrderStatus.
    const activeStatuses = ["PENDING", "PREPARING", "READY"];

    if (activeStatuses.includes(order.status)) {
      throw new BadRequestError(
        `Cannot delete an order with status ${order.status}. ` +
          `Cancel the order first before deleting it.`,
      );
    }

    // Step 3: Safe to soft delete — table is already free at this point
    try {
      return await prisma.order.update({
        where: { id: orderId },
        data: { deletedAt: new Date() },
      });
    } catch (error: unknown) {
      // P2025: order was deleted by another request between our check and update
      if (
        typeof error === "object" &&
        error !== null &&
        (error as any).code === "P2025"
      ) {
        throw new NotFoundError("Order no longer exists.");
      }
      throw error;
    }
  }
}

export const orderService = new OrderService();
