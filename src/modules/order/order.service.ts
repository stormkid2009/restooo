import crypto from "crypto";
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
   * Create a new order
   *
   * @param restaurantId - The ID of the restaurant
   * @param data - The order creation data.
   *   Note: The `tax` field is treated as a tax rate multiplier
   *   (e.g., 0.14 = 14%) and must be between 0 and 1.
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
    // These are quick business validations
    if (tip !== undefined && tip < 0) {
      throw new BadRequestError("Tip cannot be negative");
    }
    if (deliveryFee !== undefined && deliveryFee < 0) {
      throw new BadRequestError("Delivery fee cannot be negative");
    }
    if (!items || items.length === 0) {
      throw new BadRequestError("Order must contain at least one item.");
    }

    if (orderType === "DINE_IN" && !tableId) {
      throw new BadRequestError("Table ID is required for dine-in orders.");
    }

    if (orderType === "DELIVERY" && !deliveryAddress) {
      throw new BadRequestError(
        "Delivery address is required for delivery orders.",
      );
    }

    if (tax < 0 || tax > 1) {
      throw new BadRequestError("Tax rate must be between 0 and 1.");
    }
    // Optional: quantity check
    for (const item of items) {
      if (item.quantity < 1) {
        throw new BadRequestError(
          `Quantity must be at least 1 for menu item ${item.menuItemId}`,
        );
      }
    }
    // Fetch current prices for all menu items in the order
    const menuItemIds = items.map((item) => item.menuItemId);
    const uniqueMenuItemIds = [...new Set(menuItemIds)];
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: uniqueMenuItemIds }, restaurantId, deletedAt: null },
    });

    if (menuItems.length !== uniqueMenuItemIds.length) {
      throw new BadRequestError(
        "One or more menu items were not found or not available.",
      );
    }

    // Create a lookup for current prices
    const itemPrices: Record<string, number> = {};
    menuItems.forEach((mi) => {
      itemPrices[mi.id] = Number(mi.price);
    });

    // Calculate subtotal
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

    // Calculate total: subtotal + tax + tip + delivery fee
    // Note: If tax is provided as a percentage (e.g., 0.14), we calculate it against subtotal. If it's a fixed amount, it needs adjustment. Let's assume tax here is a FIXED rate multiplier.
    const taxAmountCents = Math.round(subtotalCents * tax);
    const safeTipCents = Math.round((tip ?? 0) * 100);
    const safeDeliveryFeeCents = Math.round((deliveryFee ?? 0) * 100);
    const computedTotalCents = subtotalCents + taxAmountCents + safeTipCents + safeDeliveryFeeCents;

    // Generate up to 3 candidate order numbers upfront
    const maxAttempts = 10; // changes from 3 to 10
    const orderNumberCandidates = Array.from({ length: maxAttempts }, () => {
      const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
      const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase(); // randomBytes changes from 3 to 4
      return `ORD-${datePart}-${randomPart}`;
    });

    let order;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const orderNumber = orderNumberCandidates[attempts];

        // Create Order with its Items in a Transaction
        order = await prisma.$transaction(async (tx) => {
          if (customerId) {
            const customer = await tx.customer.findFirst({
              where: { id: customerId, restaurantId, deletedAt: null },
            });
            if (!customer) {
              throw new NotFoundError("Customer not found.");
            }
          }

          // Optimistically lock the table first (prevents race conditions)
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
              // If count is 0, the table doesn't exist, is deleted, or is already occupied.
              // Throwing an error here rolls back the transaction instantly.
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
              deliveryAddress: deliveryAddress,
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

        break;
      } catch (error: any) {
        if (
          error.code === "P2002" &&
          error.meta?.target?.includes("orderNumber")
        ) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new BadRequestError(
              "Failed to generate a unique order number. Please try again.",
            );
          }
        } else {
          throw error;
        }
      }
    }
    return order!;
  }

  /**
   * Get paginated and filtered orders
   */
  async getOrders(
    restaurantId: string,
    query: ListOrderQuery,
    page = 1,
    limit = 10,
  ) {
    if (query.status) {
      const validStatuses = [
        "PENDING",
        "PREPARING",
        "READY",
        "SERVED",
        "DELIVERED",
        "COMPLETED",
        "CANCELLED",
      ];
      if (!validStatuses.includes(query.status)) {
        throw new BadRequestError("Invalid status filter.");
      }
    }

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
          items: true,
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
   * Update order status
   */
  async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    data: UpdateOrderStatusInput,
  ) {
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (
      !currentOrder ||
      currentOrder.restaurantId !== restaurantId ||
      currentOrder.deletedAt
    ) {
      throw new NotFoundError("Order not found");
    }

    const VALID_TRANSITIONS: Record<string, string[]> = {
      PENDING: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY", "CANCELLED"],
      READY: ["SERVED", "DELIVERED"],
      SERVED: ["COMPLETED"],
      DELIVERED: ["COMPLETED"],
    };

    const validPreviousStatuses = Object.entries(VALID_TRANSITIONS)
      .filter(([_, targets]) => targets.includes(data.status as string))
      .map(([prev]) => prev as any);

    if (validPreviousStatuses.length === 0) {
      throw new BadRequestError(`Invalid target status: ${data.status}`);
    }

    // Determine which timestamp to update based on the status change
    const updateData: Prisma.OrderUpdateInput = { status: data.status };
    const now = new Date();

    if (data.status === "PREPARING") updateData.acceptedAt = now;
    if (data.status === "READY") updateData.preparedAt = now;
    if (data.status === "SERVED") updateData.servedAt = now;
    if (data.status === "DELIVERED") updateData.deliveredAt = now;
    if (data.status === "COMPLETED") updateData.completedAt = now;
    if (data.status === "CANCELLED") updateData.cancelledAt = now;

    try {
      const order = await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: {
            id: orderId,
            restaurantId,
            status: { in: validPreviousStatuses },
            deletedAt: null, // Exclude soft-deleted orders
          },
          data: updateData,
        });

        // Free the table if the order is cancelled
        if (data.status === "CANCELLED" && updatedOrder.tableId) {
          await tx.table.updateMany({
            where: { id: updatedOrder.tableId },
            data: { status: "AVAILABLE" },
          });
        }

        return updatedOrder;
      });
      return order;
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new BadRequestError(
          `Invalid status transition from ${currentOrder.status} to ${data.status}`,
        );
      }
      throw error;
    }
  }

  /**
   * Soft delete order
   */
  async deleteOrder(restaurantId: string, orderId: string) {
    try {
      return await prisma.order.update({
        where: { id: orderId, restaurantId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new NotFoundError("Order not found");
      }
      throw error;
    }
  }
}

export const orderService = new OrderService();
