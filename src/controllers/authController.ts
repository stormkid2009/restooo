// src/controllers/authController.ts
import { Request, Response } from "express";
import authService from "../services/authService";

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
