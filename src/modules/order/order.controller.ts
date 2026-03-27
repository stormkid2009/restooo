import { Request, Response, NextFunction } from "express";
import { orderService } from "./order.service";
import { createOrderSchema, updateOrderStatusSchema, listOrderSchema } from "./order.schema";
import { AppUser } from "../../types/auth";

// Extend express Request locally if not globally augmented
interface AuthRequest extends Request {
  user?: AppUser;
}

export class OrderController {
  async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const restaurantId = user.restaurantId;
      if (!restaurantId) return res.status(400).json({ error: "No restaurant context found" });

      const validatedData = createOrderSchema.parse(req.body);

      // If customer creates the order, assign customerId automatically
      if (user.kind === "customer") {
          validatedData.customerId = user.id;
      }

      const order = await orderService.createOrder(restaurantId, validatedData);
      return res.status(201).json({ message: "Order created successfully", data: order });
    } catch (error: any) {
      next(error);
    }
  }

  async getOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ error: "Unauthorized" });
  
        const restaurantId = user.restaurantId;
        if (!restaurantId) return res.status(400).json({ error: "No restaurant context found" });
        
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        
        const query = listOrderSchema.parse(req.query);
        
        // If customer, restrict to their own orders
        if (user.kind === "customer") {
            query.customerId = user.id;
        }

        const result = await orderService.getOrders(restaurantId, query, page, limit);
        return res.status(200).json({ message: "Orders retrieved successfully", ...result });
    } catch (error: any) {
        next(error);
    }
  }

  async getOrderById(req: AuthRequest, res: Response, next: NextFunction) {
      try {
        const user = req.user;
        if (!user) return res.status(401).json({ error: "Unauthorized" });
  
        const restaurantId = user.restaurantId;
        if (!restaurantId) return res.status(400).json({ error: "No restaurant context found" });

        const orderId = req.params.id;
        const order = await orderService.getOrderById(restaurantId, orderId);

        // Access control: Customer can only see their own orders
        if (user.kind === "customer" && order.customerId !== user.id) {
            return res.status(403).json({ error: "Forbidden: Not your order" });
        }

        return res.status(200).json({ message: "Order retrieved successfully", data: order });
      } catch (error: any) {
          next(error);
      }
  }

  async updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
      try {
        const user = req.user;
        if (!user) return res.status(401).json({ error: "Unauthorized" });
        if (user.kind === "customer") return res.status(403).json({ error: "Forbidden: Customers cannot update status" });
  
        const restaurantId = user.restaurantId;
        if (!restaurantId) return res.status(400).json({ error: "No restaurant context found" });

        const orderId = req.params.id;
        const validatedData = updateOrderStatusSchema.parse(req.body);

        const order = await orderService.updateOrderStatus(restaurantId, orderId, validatedData);
        return res.status(200).json({ message: "Order status updated", data: order });
      } catch(error: any) {
          next(error);
      }
  }

  async deleteOrder(req: AuthRequest, res: Response, next: NextFunction) {
      try {
        const user = req.user;
        if (!user) return res.status(401).json({ error: "Unauthorized" });
        if (user.kind === "customer") return res.status(403).json({ error: "Forbidden" });

        // Optional: Ensure only admins or managers can delete orders
        // if (user.role !== "ADMIN" && user.role !== "MANAGER") { return res.status(403)... }

        const restaurantId = user.restaurantId;
        if (!restaurantId) return res.status(400).json({ error: "No restaurant context found" });

        const orderId = req.params.id;
        await orderService.deleteOrder(restaurantId, orderId);

        return res.status(200).json({ message: "Order deleted successfully" });
      } catch (error: any) {
          next(error);
      }
  }
}

export const orderController = new OrderController();
