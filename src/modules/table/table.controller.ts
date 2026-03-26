// src/modules/table/table.controller.ts
import { Request, Response } from "express";
import tableService from "./table.service";

/**
 * Table Controller
 *
 * Handles HTTP requests and responses for table management
 * Uses restaurantId from authenticated user for multi-tenancy
 */
const tableController = {
  /**
   * Create a new table
   *
   * @route POST /api/v1/tables
   * @access Private (ADMIN, MANAGER)
   */
  create: async (req: Request, res: Response) => {
    const user = req.user;
    const restaurantId = (user && user.kind === 'employee') ? (user.restaurantId || undefined) : undefined;

    if (!restaurantId) {
      return res.status(400).json({
        status: "error",
        message: "Restaurant context required",
      });
    }

    const result = await tableService.create(req.body, restaurantId);

    if (!result.success) {
      return res.status(result.code || 400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(201).json({
      status: "success",
      data: result.data,
    });
  },

  /**
   * List tables with optional filters
   *
   * @route GET /api/v1/tables
   * @access Private (Staff)
   */
  list: async (req: Request, res: Response) => {
    const filters = (req as any).validatedQuery || req.query;
    const user = req.user;
    const restaurantId = (user && user.kind === 'employee') ? (user.restaurantId || undefined) : undefined;

    if (!restaurantId) {
      return res.status(400).json({
        status: "error",
        message: "Restaurant context required",
      });
    }

    const result = await tableService.list(filters, restaurantId);

    if (!result.success) {
      return res.status(result.code || 400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(200).json({
      status: "success",
      data: result.data,
    });
  },

  /**
   * Get single table by ID
   *
   * @route GET /api/v1/tables/:id
   * @access Private (Staff)
   */
  getById: async (req: Request, res: Response) => {
    const user = req.user;
    const restaurantId = (user && user.kind === 'employee') ? (user.restaurantId || undefined) : undefined;

    if (!restaurantId) {
      return res.status(400).json({
        status: "error",
        message: "Restaurant context required",
      });
    }

    const result = await tableService.getById(req.params.id, restaurantId);

    if (!result.success) {
      return res.status(result.code || 404).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(200).json({
      status: "success",
      data: result.data,
    });
  },

  /**
   * Update table attributes
   *
   * @route PUT /api/v1/tables/:id
   * @access Private (ADMIN, MANAGER)
   */
  update: async (req: Request, res: Response) => {
    const user = req.user;
    const restaurantId = (user && user.kind === 'employee') ? (user.restaurantId || undefined) : undefined;

    if (!restaurantId) {
      return res.status(400).json({
        status: "error",
        message: "Restaurant context required",
      });
    }

    const result = await tableService.update(req.params.id, req.body, restaurantId);

    if (!result.success) {
      return res.status(result.code || 400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(200).json({
      status: "success",
      data: result.data,
    });
  },

  /**
   * Update table status
   *
   * @route PATCH /api/v1/tables/:id/status
   * @access Private (Staff)
   */
  updateStatus: async (req: Request, res: Response) => {
    const user = req.user;
    const restaurantId = (user && user.kind === 'employee') ? (user.restaurantId || undefined) : undefined;

    if (!restaurantId) {
      return res.status(400).json({
        status: "error",
        message: "Restaurant context required",
      });
    }

    const result = await tableService.updateStatus(req.params.id, req.body, restaurantId);

    if (!result.success) {
      return res.status(result.code || 400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(200).json({
      status: "success",
      data: result.data,
    });
  },

  /**
   * Delete table (soft delete)
   *
   * @route DELETE /api/v1/tables/:id
   * @access Private (ADMIN only)
   */
  delete: async (req: Request, res: Response) => {
    const user = req.user;
    const restaurantId = (user && user.kind === 'employee') ? (user.restaurantId || undefined) : undefined;

    if (!restaurantId) {
      return res.status(400).json({
        status: "error",
        message: "Restaurant context required",
      });
    }

    const result = await tableService.delete(req.params.id, restaurantId);

    if (!result.success) {
      return res.status(result.code || 400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(204).send();
  },
};

export default tableController;
