// src/modules/menu/menu.controller.ts
import { Request, Response } from "express";
import menuService from "./menu.service";

/**
 * Menu Controller
 *
 * Handles HTTP requests and responses for menu management
 * Uses restaurantId from authenticated user for multi-tenancy
 */
const menuController = {
  /**
   * Create a new menu item
   *
   * @route POST /api/v1/menu
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

    const result = await menuService.create(req.body, restaurantId);

    if (!result.success) {
      return res.status(400).json({
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
   * List menu items with filters
   *
   * @route GET /api/v1/menu
   * @access Public (shows restaurant's menu if authenticated, all if not)
   */
  list: async (req: Request, res: Response) => {
    const filters = (req as any).validatedQuery || req.query;
    const user = req.user;
    const restaurantId = (user && user.kind === 'employee') ? (user.restaurantId || undefined) : undefined;

    const result = await menuService.list(filters, restaurantId);

    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(200).json({
      status: "success",
      data: result.data.items,
      pagination: result.data.pagination,
    });
  },

  /**
   * Get single menu item by ID
   *
   * @route GET /api/v1/menu/:id
   * @access Public
   */
  getById: async (req: Request, res: Response) => {
    const user = req.user;
    const restaurantId = (user && user.kind === 'employee') ? (user.restaurantId || undefined) : undefined;

    const result = await menuService.getById(req.params.id, restaurantId);

    if (!result.success) {
      return res.status(404).json({
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
   * Update menu item (partial update)
   *
   * @route PUT /api/v1/menu/:id
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

    const result = await menuService.update(req.params.id, req.body, restaurantId);

    if (!result.success) {
      const statusCode = result.error === "Menu item not found" ? 404 : 400;

      return res.status(statusCode).json({
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
   * Delete menu item (soft delete)
   *
   * @route DELETE /api/v1/menu/:id
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

    const result = await menuService.delete(req.params.id, restaurantId);

    if (!result.success) {
      const statusCode = result.error === "Menu item not found" ? 404 : 400;

      return res.status(statusCode).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(204).send();
  },
};

export default menuController;
