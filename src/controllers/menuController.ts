// src/controllers/menuController.ts
import { Request, Response } from "express";
import menuService from "../services/menuService";

/**
 * Menu Controller
 *
 * Handles HTTP requests and responses for menu management
 * Controllers are THIN - they just handle HTTP stuff
 * Business logic lives in the service layer
 */
const menuController = {
  /**
   * Create a new menu item
   *
   * @route POST /api/v1/menu
   * @access Private (ADMIN, MANAGER)
   *
   * @param req - Express request with validated body
   * @param res - Express response
   *
   * @returns 201 - Menu item created
   * @returns 400 - Failed to create
   */
  create: async (req: Request, res: Response) => {
    const result = await menuService.create(req.body);

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
   * List all menu items with filters
   *
   * @route GET /api/v1/menu
   * @access Public
   *
   * Query params:
   * - category: Filter by category
   * - available: Filter by availability (true/false)
   * - minPrice: Minimum price
   * - maxPrice: Maximum price
   * - search: Search by name
   * - limit: Items per page (default 20, max 100)
   * - offset: Items to skip (default 0)
   *
   * @param req - Express request with query params
   * @param res - Express response
   *
   * @returns 200 - List of menu items with pagination
   */
  list: async (req: Request, res: Response) => {
    // Use validatedQuery (transformed by validateQuery middleware)
    // Falls back to req.query if validation middleware not used
    const filters = (req as any).validatedQuery || req.query;

    const result = await menuService.list(filters);

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
   *
   * @param req - Express request with id param
   * @param res - Express response
   *
   * @returns 200 - Menu item found
   * @returns 404 - Menu item not found
   */
  getById: async (req: Request, res: Response) => {
    const result = await menuService.getById(req.params.id);

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
   *
   * @param req - Express request with id param and body
   * @param res - Express response
   *
   * @returns 200 - Menu item updated
   * @returns 404 - Menu item not found
   * @returns 400 - Update failed
   */
  update: async (req: Request, res: Response) => {
    const result = await menuService.update(req.params.id, req.body);

    if (!result.success) {
      // Check if error is "not found" or other error
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
   * Delete menu item
   *
   * @route DELETE /api/v1/menu/:id
   * @access Private (ADMIN only)
   *
   * @param req - Express request with id param
   * @param res - Express response
   *
   * @returns 204 - Menu item deleted (no content)
   * @returns 404 - Menu item not found
   * @returns 400 - Delete failed
   */
  delete: async (req: Request, res: Response) => {
    const result = await menuService.delete(req.params.id);

    if (!result.success) {
      // Check if error is "not found" or other error
      const statusCode = result.error === "Menu item not found" ? 404 : 400;

      return res.status(statusCode).json({
        status: "error",
        message: result.error,
      });
    }

    // 204 No Content - successful deletion
    return res.status(204).send();
  },
};

export default menuController;
