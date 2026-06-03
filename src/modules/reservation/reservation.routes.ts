import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate, authorize } from "../../middleware/authenticate";
import { requireRestaurantContext } from "../../middleware/restaurantContext";
import {
  createReservationSchema,
  updateReservationSchema,
  updateReservationStatusSchema,
  getReservationsQuerySchema,
  checkAvailabilityQuerySchema,
} from "./reservation.schema";
import reservationController from "./reservation.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  requireRestaurantContext,
  validateRequest(getReservationsQuerySchema, "query"),
  reservationController.list
);

router.get(
  "/availability",
  authenticate,
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  requireRestaurantContext,
  validateRequest(checkAvailabilityQuerySchema, "query"),
  reservationController.checkAvailability
);

router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  requireRestaurantContext,
  reservationController.getById
);

router.post(
  "/",
  authenticate,
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  requireRestaurantContext,
  validateRequest(createReservationSchema),
  reservationController.create
);

router.put(
  "/:id",
  authenticate,
  authorize(["ADMIN", "MANAGER"]),
  requireRestaurantContext,
  validateRequest(updateReservationSchema),
  reservationController.update
);

router.patch(
  "/:id/status",
  authenticate,
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  requireRestaurantContext,
  validateRequest(updateReservationStatusSchema),
  reservationController.updateStatus
);

router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  requireRestaurantContext,
  reservationController.delete
);

export default router;
