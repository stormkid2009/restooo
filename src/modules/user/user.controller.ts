// src/features/user/user.controller.ts
import { Request, Response } from "express";
import userService from "./user.service";
import {
  CreateUserInput,
  UpdateUserInput,
  UpdateProfileInput,
  UserQueryInput,
} from "./user.schema";

/**
 * UserController
 * Handles HTTP requests for user management
 */
class UserController {
  /**
   * Get all users with filtering and pagination
   * GET /api/v1/users
   * Requires ADMIN or MANAGER role
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const query: UserQueryInput = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
        role: req.query.role as any,
        active: req.query.active ? req.query.active === "true" : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await userService.getUsers(query);

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
      console.error("Get users controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get single user by ID
   * GET /api/v1/users/:id
   * Requires ADMIN or MANAGER role
   */
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await userService.getUserById(id);

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
      console.error("Get user controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Create new user
   * POST /api/v1/users
   * Requires ADMIN role
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateUserInput = req.body;

      const result = await userService.createUser(data);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Create user controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update user by ID
   * PUT /api/v1/users/:id
   * Requires ADMIN or MANAGER role
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateUserInput = req.body;

      const result = await userService.updateUser(id, data);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Update user controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update own profile
   * PATCH /api/v1/users/profile
   * Requires authentication
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const data: UpdateProfileInput = req.body;

      const result = await userService.updateProfile(userId, data);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Update profile controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Delete user (soft delete)
   * DELETE /api/v1/users/:id
   * Requires ADMIN role
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await userService.deleteUser(id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Delete user controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Activate user
   * PATCH /api/v1/users/:id/activate
   * Requires ADMIN role
   */
  async activateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await userService.activateUser(id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "User activated successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Activate user controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Deactivate user
   * PATCH /api/v1/users/:id/deactivate
   * Requires ADMIN role
   */
  async deactivateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await userService.deactivateUser(id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "User deactivated successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Deactivate user controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default new UserController();
