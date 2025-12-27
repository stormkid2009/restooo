// src/controllers/authController.ts
import { Request, Response } from "express";
import authService from "../services/authService";
import prisma from "../config/database";

/**
 * Auth Controller
 *
 * Handles HTTP requests and responses for authentication
 * Controllers are THIN - they just handle HTTP stuff
 * Business logic lives in the service layer
 */
const authController = {
  /**
   * Register a new user
   *
   * @route POST /api/v1/auth/register
   * @access Public
   *
   * Request body is already validated by validation middleware
   *
   * @param req - Express request object (contains validated body)
   * @param res - Express response object
   *
   * @returns 201 - User created successfully
   * @returns 409 - Email already exists
   * @returns 400 - Other validation/creation errors
   */
  register: async (req: Request, res: Response) => {
    // Call service to handle business logic
    const result = await authService.register(req.body);

    // Check if registration failed
    if (!result.success) {
      // Handle specific error: email already exists
      if (result.error === "Email already exists") {
        return res.status(409).json({
          status: "error",
          message: result.error,
        });
      }

      // Handle other errors (validation, database, etc.)
      return res.status(400).json({
        status: "error",
        message: result.error,
      });
    }

    // Success! User created and auto-logged in
    return res.status(201).json({
      status: "success",
      data: result.data, // Contains: { user, token }
    });
  },

  /**
   * Login existing user
   *
   * @route POST /api/v1/auth/login
   * @access Public
   *
   * Request body is already validated by validation middleware
   *
   * @param req - Express request object (contains validated body)
   * @param res - Express response object
   *
   * @returns 200 - Login successful
   * @returns 401 - Invalid credentials (wrong email or password)
   */
  login: async (req: Request, res: Response) => {
    // Call service to handle authentication logic
    const result = await authService.login(req.body);

    // Check if login failed
    if (!result.success) {
      // Invalid credentials (user not found or wrong password)
      // Always return 401 Unauthorized for security
      return res.status(401).json({
        status: "error",
        message: result.error, // "Invalid credentials"
      });
    }

    // Success! User authenticated
    return res.status(200).json({
      status: "success",
      data: result.data, // Contains: { user, token }
    });
  },
  /**
   * Get current authenticated user information
   *
   * @route GET /api/v1/auth/me
   * @access Private
   *
   * Returns full user information from database
   * User ID is extracted from JWT token by authMiddleware
   *
   * @param req - Express request object (has req.user from middleware)
   * @param res - Express response object
   *
   * @returns 200 - User information
   * @returns 404 - User not found (token valid but user deleted)
   * @returns 500 - Server error
   */
  me: async (req: Request, res: Response) => {
    try {
      // req.user is set by authMiddleware
      // It contains: { userId, email, role }

      // Query full user information from database
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
      });

      // Check if user exists
      // This can happen if user was deleted but token is still valid
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // Remove password from response (security)
      const { password, ...userWithoutPassword } = user;

      // Return complete user information
      return res.status(200).json({
        status: "success",
        data: {
          user: userWithoutPassword,
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to get user information",
      });
    }
  },

  /**
   * Logout current user
   *
   * @route POST /api/v1/auth/logout
   * @access Private
   *
   * Note: With JWT, logout is primarily client-side (remove token)
   * This endpoint confirms logout and can be extended with token blacklist
   *
   * @param req - Express request object (has req.user from middleware)
   * @param res - Express response object
   *
   * @returns 200 - Logout successful
   *
   * TODO: Implement server-side token blacklist
   * - Extract token from req.headers.authorization
   * - Add token to Redis blacklist with TTL matching token expiry
   * - Check blacklist in authMiddleware before verifying token
   * - This enables immediate token invalidation (more secure)
   */
  logout: async (req: Request, res: Response) => {
    // For now, logout is client-side only
    // Client should remove token from localStorage/cookies

    // Future: Add token to blacklist here
    // const token = req.headers.authorization?.split(' ')[1];
    // await redis.set(`blacklist:${token}`, 'true', 'EX', tokenExpiry);

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  },
};

export default authController;
/**
 * Usage in routes:
 *
 * import authController from '../controllers/authController';
 * import { validate } from '../middleware/validationMiddleware';
 * import { registerSchema, loginSchema } from '../validators/authValidator';
 *
 * router.post('/register', validate(registerSchema), authController.register);
 * router.post('/login', validate(loginSchema), authController.login);
 */
