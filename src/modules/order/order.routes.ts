import { Router } from "express";
import { orderController } from "./order.controller";
// Depending on auth implementation, importing appropriate middleware
import { authenticateAny } from "../../middleware/authenticate";

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(authenticateAny);

router.post("/", orderController.createOrder);
router.get("/", orderController.getOrders);
router.get("/:id", orderController.getOrderById);
router.patch("/:id/status", orderController.updateOrderStatus);
router.delete("/:id", orderController.deleteOrder);

export default router;
