// src/modules/auth/auth.routes.ts
import { Router } from "express";
import authController from "./auth.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../../middleware/authenticate";
import { changePasswordSchema, loginSchema, registerCustomerSchema, refreshTokenSchema } from "./auth.schema";

const router = Router();

/**
 * Auth Routes
 * Public endpoints (no authentication required)
 * NOTE: Employee registration is NOT public. Employees are created via
 * POST /api/v1/employee (requires ADMIN role)
 */

// POST /api/v1/auth/login/employee
router.post("/login/employee", validateRequest(loginSchema), authController.loginEmployee);

// POST /api/v1/auth/login/customer
router.post("/login/customer", validateRequest(loginSchema), authController.loginCustomer);

// POST /api/v1/auth/register/customer
router.post(
  "/register/customer",
  validateRequest(registerCustomerSchema),
  authController.registerCustomer
);

// POST /api/v1/auth/refresh
router.post(
  "/refresh",
  validateRequest(refreshTokenSchema),
  authController.refresh,
);

/**
 * Protected Auth Routes
 * Require authentication
 */

// GET /api/v1/auth/me - Get current user
router.get("/me", authenticate, authController.me);

// POST /api/v1/auth/logout - Logout current user
router.post("/logout", authenticate, authController.logout);

// PATCH /api/v1/auth/change-password - Change password (authenticated)
router.patch(
  "/change-password",
  authenticate,
  validateRequest(changePasswordSchema),
  authController.changePassword,
);

export default router;
