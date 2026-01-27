import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import userService from "../modules/user/user.service";

/**
 * Extended Request with user info
 */
export type AuthRequest = Request & {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    active: boolean;
  };
};

/**
 * JWT Payload Interface
 */
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Authenticate Middleware
 *
 * Verifies JWT token and attaches user to request
 * Gets fresh user data from database to ensure current info
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Access token is required",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, secret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: "Token expired",
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: "Invalid token",
        });
        return;
      }

      throw error;
    }

    // Get fresh user data from database
    const userResult = await userService.getUserById(decoded.userId);

    if (!userResult.success) {
      res.status(401).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const user = userResult.data;

    // Check if user is active
    if (!user.active) {
      res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
      return;
    }

    // Attach user to request
    (req as any).user = user;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

/**
 * Authorize Middleware
 *
 * Checks if authenticated user has required role(s)
 * Must be used AFTER authenticate middleware
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        required: allowedRoles,
        current: user.role,
      });
      return;
    }

    next();
  };
};
