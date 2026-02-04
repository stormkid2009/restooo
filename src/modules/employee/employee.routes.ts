// ============================================
// src/modules/employee/employee.routes.ts
// ============================================
import { Router } from "express";
import employeeController from "./employee.controller";
import { authenticate, authorize } from "../../middleware/authenticate";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
  employeeIdSchema,
} from "./employee.schema";

const router = Router();

/**
 * Employee Routes
 * All routes require authentication
 * Most require ADMIN or MANAGER role
 */

// GET /api/v1/employee - List all employees
router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "MANAGER"]),
  validateRequest(employeeQuerySchema, "query"),
  employeeController.getEmployees,
);

// GET /api/v1/employee/:id - Get employee by ID
router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN", "MANAGER"]),
  validateRequest(employeeIdSchema, "params"),
  employeeController.getEmployeeById,
);

// POST /api/v1/employee - Create new employee (ADMIN only)
router.post(
  "/",
  authenticate,
  authorize(["ADMIN"]),
  validateRequest(createEmployeeSchema),
  employeeController.createEmployee,
);

// PUT /api/v1/employee/:id - Update employee (ADMIN or MANAGER)
router.put(
  "/:id",
  authenticate,
  authorize(["ADMIN", "MANAGER"]),
  validateRequest(employeeIdSchema, "params"),
  validateRequest(updateEmployeeSchema),
  employeeController.updateEmployee,
);

// DELETE /api/v1/employee/:id - Delete employee (ADMIN only)
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  validateRequest(employeeIdSchema, "params"),
  employeeController.deleteEmployee,
);

// PATCH /api/v1/employee/:id/activate - Activate employee
router.patch(
  "/:id/activate",
  authenticate,
  authorize(["ADMIN"]),
  validateRequest(employeeIdSchema, "params"),
  employeeController.activateEmployee,
);

// PATCH /api/v1/employee/:id/deactivate - Deactivate employee
router.patch(
  "/:id/deactivate",
  authenticate,
  authorize(["ADMIN"]),
  validateRequest(employeeIdSchema, "params"),
  employeeController.deactivateEmployee,
);

export default router;
