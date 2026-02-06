// src/modules/employee/employee.controller.ts
import { Request, Response } from "express";
import employeeService from "./employee.service";
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeQueryInput,
  AdminResetPasswordInput,
} from "./employee.schema";

/**
 * EmployeeController
 * Handles HTTP requests for employee management
 */
class EmployeeController {
  /**
   * Get all employees with filtering and pagination
   * GET /api/v1/employee
   * Requires ADMIN or MANAGER role
   */
  async getEmployees(req: Request, res: Response): Promise<void> {
    try {
      const query: EmployeeQueryInput = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
        role: req.query.role as any,
        active: req.query.active ? req.query.active === "true" : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      // Get restaurantId from authenticated user for multi-tenancy
      const restaurantId = (req as any).user?.restaurantId;

      const result = await employeeService.getEmployees(query, restaurantId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        ...result.data,
      });
    } catch (error) {
      console.error("Get employees controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get single employee by ID
   * GET /api/v1/employee/:id
   * Requires ADMIN or MANAGER role
   */
  async getEmployeeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await employeeService.getEmployeeById(id);

      if (!result.success) {
        res.status(404).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error("Get employee controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Create new employee
   * POST /api/v1/employee
   * Requires ADMIN role
   */
  async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateEmployeeInput = req.body;

      // If no restaurantId provided, use the one from the authenticated admin
      if (!data.restaurantId) {
        data.restaurantId = (req as any).user?.restaurantId;
      }

      const result = await employeeService.createEmployee(data);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Create employee controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update employee by ID
   * PUT /api/v1/employee/:id
   * Requires ADMIN or MANAGER role
   */
  async updateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateEmployeeInput = req.body;

      const result = await employeeService.updateEmployee(id, data);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee updated successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Update employee controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Delete employee (soft delete)
   * DELETE /api/v1/employee/:id
   * Requires ADMIN role
   */
  async deleteEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await employeeService.deleteEmployee(id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee deleted successfully",
      });
    } catch (error) {
      console.error("Delete employee controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Activate employee
   * PATCH /api/v1/employee/:id/activate
   * Requires ADMIN role
   */
  async activateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await employeeService.activateEmployee(id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee activated successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Activate employee controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Deactivate employee
   * PATCH /api/v1/employee/:id/deactivate
   * Requires ADMIN role
   */
  async deactivateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await employeeService.deactivateEmployee(id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee deactivated successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Deactivate employee controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Reset employee password
   * PATCH /api/v1/employee/:id/password
   * Requires ADMIN role
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: AdminResetPasswordInput = req.body;

      const result = await employeeService.resetEmployeePassword(id, data);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Reset password controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default new EmployeeController();
