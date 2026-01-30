// ============================================
// src/modules/user/user.routes.ts
// ============================================
import { Router } from "express";
import userController from "./user.controller";
import { authenticate, authorize } from "../../middleware/authenticate";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  userQuerySchema,
  userIdSchema,
} from "./user.schema";

const router = Router();

/**
 * User Routes
 * All routes require authentication
 * Most require ADMIN or MANAGER role
 */

// GET /api/v1/user - List all users
router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "MANAGER"]),
  validateRequest(userQuerySchema, "query"),
  userController.getUsers,
);

// GET /api/v1/user/:id - Get user by ID
router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN", "MANAGER"]),
  validateRequest(userIdSchema, "params"),
  userController.getUserById,
);

// POST /api/v1/user - Create new user (ADMIN only)
router.post(
  "/",
  authenticate,
  authorize(["ADMIN"]),
  validateRequest(createUserSchema),
  userController.createUser,
);

// PUT /api/v1/user/:id - Update user (ADMIN or MANAGER)
router.put(
  "/:id",
  authenticate,
  authorize(["ADMIN", "MANAGER"]),
  validateRequest(userIdSchema, "params"),
  validateRequest(updateUserSchema),
  userController.updateUser,
);

// PATCH /api/v1/user/profile - Update own profile
router.patch(
  "/profile",
  authenticate,
  validateRequest(updateProfileSchema),
  userController.updateProfile,
);

// DELETE /api/v1/user/:id - Delete user (ADMIN only)
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  validateRequest(userIdSchema, "params"),
  userController.deleteUser,
);

// PATCH /api/v1/user/:id/activate - Activate user
router.patch(
  "/:id/activate",
  authenticate,
  authorize(["ADMIN"]),
  validateRequest(userIdSchema, "params"),
  userController.activateUser,
);

// PATCH /api/v1/user/:id/deactivate - Deactivate user
router.patch(
  "/:id/deactivate",
  authenticate,
  authorize(["ADMIN"]),
  validateRequest(userIdSchema, "params"),
  userController.deactivateUser,
);

export default router;
