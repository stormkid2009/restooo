import { Prisma } from "@prisma/client";
import prisma from "../../config/database";
import { CreateOrderInput, UpdateOrderInput, UpdateOrderStatusInput, ListOrderQuery } from "./order.schema";

export class OrderService {
  /**
   * Create a new order
   */
  async createOrder(restaurantId: string, data: CreateOrderInput) {
    const { items, tableId, customerId, orderType, tax, tip, deliveryAddress, deliveryFee } = data;

    // Fetch current prices for all menu items in the order
    const menuItemIds = items.map((item) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: menuItemIds }, restaurantId, deletedAt: null }
    });

    if (menuItems.length !== menuItemIds.length) {
        throw new Error("One or more menu items were not found or not available.");
    }

    // Create a lookup for current prices
    const itemPrices: Record<string, number> = {};
    menuItems.forEach((mi) => {
        itemPrices[mi.id] = Number(mi.price);
    });

    // Calculate subtotal
    let subtotal = 0;
    const orderItemsRecord: { menuItemId: string, quantity: number, price: number, specialInstructions: string | null }[] = [];

    items.forEach((item) => {
        const itemPrice = itemPrices[item.menuItemId];
        subtotal += itemPrice * item.quantity;
        orderItemsRecord.push({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: itemPrice, // Snapshot price at time of order
            specialInstructions: item.specialInstructions || null
        });
    });

    // Calculate total: subtotal + tax + tip + delivery fee
    // Note: If tax is provided as a percentage (e.g., 0.14), we calculate it against subtotal. If it's a fixed amount, it needs adjustment. Let's assume tax here is a FIXED rate multiplier.
    const taxAmount = subtotal * tax;
    const computedTotal = subtotal + taxAmount + tip + deliveryFee;

    // Generate unique order number logic
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;

    // Create Order with its Items in a Transaction
    const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
            data: {
                restaurantId,
                orderNumber,
                tableId,
                customerId,
                orderType,
                subtotal: subtotal,
                tax: taxAmount, 
                tip: tip,
                deliveryFee: deliveryFee,
                total: computedTotal,
                deliveryAddress: deliveryAddress,
                status: "PENDING",
                items: {
                    create: orderItemsRecord
                }
            },
            include: {
                items: true,
                table: true,
                customer: true
            }
        });

        // Optionally, if DINE_IN and table exists, we may want to update the table status to OCCUPIED
        if (tableId && orderType === "DINE_IN") {
            await tx.table.update({
                where: { id: tableId },
                data: { status: "OCCUPIED" }
            });
        }

        return newOrder;
    });

    return order;
  }

  /**
   * Get paginated and filtered orders
   */
  async getOrders(restaurantId: string, query: ListOrderQuery, page = 1, limit = 10) {
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
          employee: true
        }
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
                menuItem: true
            }
        },
        table: true,
        customer: true,
        employee: true
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(restaurantId: string, orderId: string, data: UpdateOrderStatusInput) {
    // Determine which timestamp to update based on the status change
    const updateData: Prisma.OrderUpdateInput = { status: data.status };
    const now = new Date();

    if (data.status === "PREPARING") updateData.acceptedAt = now;
    if (data.status === "READY") updateData.preparedAt = now;
    if (data.status === "SERVED") updateData.servedAt = now;
    if (data.status === "OUT_FOR_DELIVERY") updateData.preparedAt = now;
    if (data.status === "DELIVERED") updateData.deliveredAt = now;
    if (data.status === "COMPLETED") updateData.completedAt = now;

    const orderExists = await prisma.order.findFirst({
      where: { id: orderId, restaurantId }
    });

    if (!orderExists) {
        throw new Error("Order not found");
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

    return order;
  }

  /**
   * Soft delete order
   */
  async deleteOrder(restaurantId: string, orderId: string) {
    return prisma.order.updateMany({
      where: { id: orderId, restaurantId },
      data: { deletedAt: new Date() },
    });
  }
}

export const orderService = new OrderService();
