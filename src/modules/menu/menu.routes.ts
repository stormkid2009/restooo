// src/routes/menuRoutes.ts
import { Router } from "express";
import { validate, validateQuery } from "../../middleware/validationMiddleware";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import {
  createMenuSchema,
  updateMenuSchema,
  listMenuSchema,
} from "./menu.schema";
import menuController from "./menu.controller";

const router = Router();

/**
 * @route   GET /api/v1/menu
 * @desc    List all menu items with filters and pagination
 * @access  Public
 * @query   category, available, minPrice, maxPrice, search, limit, offset
 * @returns { status: "success", data: [...items], pagination: {...} }
 */
router.get("/", validateQuery(listMenuSchema), menuController.list);

/**
 * @route   GET /api/v1/menu/:id
 * @desc    Get single menu item by ID
 * @access  Public
 * @params  id - Menu item UUID
 * @returns { status: "success", data: {...menuItem} }
 */
router.get("/:id", menuController.getById);

/**
 * @route   POST /api/v1/menu
 * @desc    Create new menu item
 * @access  Private (ADMIN, MANAGER only)
 * @headers Authorization: Bearer <token>
 * @body    { name, description?, category, price, available?, allergens?, prepTimeMinutes? }
 * @returns { status: "success", data: {...menuItem} }
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["ADMIN", "MANAGER"]),
  validate(createMenuSchema),
  menuController.create,
);

/**
 * @route   PUT /api/v1/menu/:id
 * @desc    Update menu item (partial update)
 * @access  Private (ADMIN, MANAGER only)
 * @headers Authorization: Bearer <token>
 * @params  id - Menu item UUID
 * @body    Any fields to update (all optional)
 * @returns { status: "success", data: {...updatedMenuItem} }
 */
router.put(
  "/:id",
  authMiddleware,
  requireRole(["ADMIN", "MANAGER"]),
  validate(updateMenuSchema),
  menuController.update,
);

/**
 * @route   DELETE /api/v1/menu/:id
 * @desc    Delete menu item
 * @access  Private (ADMIN only)
 * @headers Authorization: Bearer <token>
 * @params  id - Menu item UUID
 * @returns 204 No Content
 */
router.delete(
  "/:id",
  authMiddleware,
  requireRole(["ADMIN"]),
  menuController.delete,
);

export default router;

/**
 * Usage in routes/index.ts:
 *
 * import menuRoutes from './menuRoutes';
 * router.use('/menu', menuRoutes);
 *
 * This creates the following endpoints:
 * - GET    /api/v1/menu           (Public)
 * - GET    /api/v1/menu/:id       (Public)
 * - POST   /api/v1/menu           (ADMIN, MANAGER)
 * - PUT    /api/v1/menu/:id       (ADMIN, MANAGER)
 * - DELETE /api/v1/menu/:id       (ADMIN only)
 */
