// src/modules/table/table.routes.ts
import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate, authorize } from "../../middleware/authenticate";
import {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema,
  listTableSchema,
} from "./table.schema";
import tableController from "./table.controller";

const router = Router();

/**
 * @route   GET /api/v1/table
 * @desc    List all tables with optional filters
 * @access  Private (Staff)
 * @query   status, minCapacity, location
 * @returns { status: "success", data: [...items] }
 */
router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "MANAGER", "STAFF", "CHEF"]),
  validateRequest(listTableSchema, "query"),
  tableController.list
);

/**
 * @route   GET /api/v1/table/:id
 * @desc    Get single table by ID
 * @access  Private (Staff)
 * @params  id - Table item UUID
 * @returns { status: "success", data: {...tableItem} }
 */
router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN", "MANAGER", "STAFF", "CHEF"]),
  tableController.getById
);

/**
 * @route   POST /api/v1/table
 * @desc    Create new table
 * @access  Private (ADMIN, MANAGER only)
 * @headers Authorization: Bearer <token>
 * @body    { number, capacity, location?, status? }
 * @returns { status: "success", data: {...tableItem} }
 */
router.post(
  "/",
  authenticate,
  authorize(["ADMIN", "MANAGER"]),
  validateRequest(createTableSchema),
  tableController.create,
);

/**
 * @route   PUT /api/v1/table/:id
 * @desc    Update table attributes (capacity, location)
 * @access  Private (ADMIN, MANAGER only)
 * @headers Authorization: Bearer <token>
 * @params  id - Table item UUID
 * @body    Any fields to update (partial)
 * @returns { status: "success", data: {...updatedTableItem} }
 */
router.put(
  "/:id",
  authenticate,
  authorize(["ADMIN", "MANAGER"]),
  validateRequest(updateTableSchema),
  tableController.update,
);

/**
 * @route   PATCH /api/v1/table/:id/status
 * @desc    Update table status quickly
 * @access  Private (Staff)
 * @headers Authorization: Bearer <token>
 * @params  id - Table item UUID
 * @body    { status: "AVAILABLE" | "OCCUPIED" | "DIRTY" | "MAINTENANCE" | "RESERVED" }
 * @returns { status: "success", data: {...updatedTableItem} }
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  validateRequest(updateTableStatusSchema),
  tableController.updateStatus,
);

/**
 * @route   DELETE /api/v1/table/:id
 * @desc    Delete table (soft delete)
 * @access  Private (ADMIN only)
 * @headers Authorization: Bearer <token>
 * @params  id - Table item UUID
 * @returns 204 No Content
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  tableController.delete,
);

export default router;

/**
 * Usage in routes/index.ts:
 *
 * import tableRoutes from './table/table.routes';
 * router.use('/table', tableRoutes);
 *
 * This creates the following endpoints:
 * - GET    /api/v1/table           (Staff)
 * - GET    /api/v1/table/:id       (Staff)
 * - POST   /api/v1/table           (ADMIN, MANAGER)
 * - PUT    /api/v1/table/:id       (ADMIN, MANAGER)
 * - PATCH  /api/v1/table/:id/status(ADMIN, MANAGER, STAFF)
 * - DELETE /api/v1/table/:id       (ADMIN only)
 */
