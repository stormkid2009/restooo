// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * JWT Payload Interface
 * Defines the structure of data stored in the token
 */
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

/**
 * Authentication Middleware
 *
 * Verifies JWT token from Authorization header and attaches user to request
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 *
 * @returns 401 if no token, invalid token, or expired token
 *
 * Usage:
 * router.get('/protected', authMiddleware, controller)
 *
 * TODO: Make error messages configurable based on NODE_ENV
 * - Development: Specific errors for debugging
 * - Production: Generic "Unauthorized" for security
 *
 * TODO: Implement token refresh mechanism
 * - Short-lived access tokens (15min)
 * - Long-lived refresh tokens (7 days)
 * - Endpoint: POST /auth/refresh
 *
 * TODO: Implement token blacklist for proper logout
 * - Store revoked tokens in Redis with TTL
 * - Check blacklist before verifying token
 * - Enable server-side session invalidation
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void | Response => {
  try {
    // Step 1: Extract Authorization header
    const authHeader = req.headers.authorization;

    // Step 2: Check if header exists
    if (!authHeader) {
      return res.status(401).json({
        status: "error",
        message: "No token provided",
      });
    }

    // Step 3: Verify Bearer format and extract token
    // Expected format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        status: "error",
        message: "Token format invalid. Expected: Bearer <token>",
      });
    }

    const token = parts[1];

    // Step 4: Verify token with JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Step 5: Attach user info to request object
    // This makes user data available to all subsequent middleware/controllers
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    // Step 6: Continue to next middleware/controller
    next();
  } catch (error) {
    // Handle JWT-specific errors
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        status: "error",
        message: "Token expired",
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token",
      });
    }

    // Handle unexpected errors
    return res.status(401).json({
      status: "error",
      message: "Authentication failed",
    });
  }
};

/**
 * Role-Based Authorization Middleware Factory
 *
 * Creates middleware that checks if authenticated user has required role(s)
 * MUST be used after authMiddleware
 *
 * @param allowedRoles - Array of roles that can access the route
 * @returns Express middleware function
 *
 * @example
 * // Only ADMIN and MANAGER can delete menu items
 * router.delete('/menu/:id',
 *   authMiddleware,
 *   requireRole(['ADMIN', 'MANAGER']),
 *   menuController.delete
 * );
 *
 * @example
 * // Only ADMIN can access analytics
 * router.get('/analytics',
 *   authMiddleware,
 *   requireRole(['ADMIN']),
 *   analyticsController.getSales
 * );
 *
 * TODO: Implement permission-based authorization
 * - Move beyond simple roles to fine-grained permissions
 * - Example: 'menu:create', 'order:delete', 'analytics:view'
 * - Store permissions in database linked to roles
 * - Middleware: requirePermission(['menu:create', 'menu:update'])
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    // Step 1: Ensure user is authenticated
    // This should never happen if authMiddleware is used correctly
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized - Authentication required",
      });
    }

    // Step 2: Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: `Forbidden - Requires one of the following roles: ${allowedRoles.join(", ")}`,
      });
    }

    // Step 3: User has required role, continue
    next();
  };
};

/**
 * Optional Authentication Middleware
 *
 * Attaches user to request if valid token exists, but doesn't block request
 * Useful for routes that work for both authenticated and unauthenticated users
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 *
 * @example
 * // Menu endpoint that shows favorites for logged-in users
 * router.get('/menu', optionalAuth, menuController.list);
 * // Controller can check: if (req.user) { show favorites }
 *
 * TODO: Implement this middleware when needed
 * Currently not used, but documented for future implementation
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    // No token? That's fine, just continue
    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(" ");

    // Invalid format? Ignore and continue
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return next();
    }

    const token = parts[1];

    // Try to verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Valid token - attach user
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    // Invalid/expired token - just continue without user
    // Don't return error, this is optional auth
  }

  next();
};
