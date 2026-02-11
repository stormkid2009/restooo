// src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import authService from "./auth.service";
import { ChangePasswordInput, LoginInput, RegisterInput } from "./auth.schema";

/**
 * AuthController
 * Handles HTTP requests for authentication
 */
class AuthController {
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const data: RegisterInput = req.body;

      const result = await authService.register(data);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Register controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const data: LoginInput = req.body;

      const result = await authService.login(data);

      if (!result.success) {
        res.status(401).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result.data,
      });
    } catch (error) {
      console.error("Login controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get current user info
   * GET /api/v1/auth/me
   * Requires authentication
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      // User is attached to request by auth middleware
      const user = req.user;

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Me controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Logout user
   * POST /api/v1/auth/logout
   * TODO: Implement token blacklisting
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Add token to blacklist (Redis)
      // For now, just return success
      // Client should delete token from storage

      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      console.error("Logout controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
        return;
      }

      const result = await authService.refreshAccessToken(refreshToken);

      if (!result.success) {
        res.status(401).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Refresh controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Change password for authenticated user
   * PATCH /api/v1/auth/change-password
   * Requires authentication
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const userId = user?.id;
      const data: ChangePasswordInput = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      const result = await authService.changePassword(userId, data);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.data.message,
      });
    } catch (error) {
      console.error("Change password controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default new AuthController();
