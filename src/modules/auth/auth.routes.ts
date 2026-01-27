// src/modules/auth/auth.routes.ts
import { Router } from "express";
import authController from "./auth.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../../middleware/authenticate";
import { loginSchema, registerSchema, refreshTokenSchema } from "./auth.schema";

const router = Router();

/**
 * Auth Routes
 * Public endpoints (no authentication required)
 */

// POST /api/v1/auth/register
router.post(
  "/register",
  validateRequest(registerSchema),
  authController.register,
);

// POST /api/v1/auth/login
router.post("/login", validateRequest(loginSchema), authController.login);

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

export default router;
