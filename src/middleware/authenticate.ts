import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import employeeService from "../modules/employee/employee.service";

/**
 * Extended Request with user info (Employee data)
 */
export type AuthRequest = Request & {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    active: boolean;
    restaurantId: string | null;
  };
};

/**
 * JWT Payload Interface
 * Includes restaurantId for multi-tenancy
 */
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  restaurantId: string | null;
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

    // Get fresh employee data from database
    const employeeResult = await employeeService.getEmployeeById(decoded.userId);

    if (!employeeResult.success) {
      res.status(401).json({
        success: false,
        message: "Employee not found",
      });
      return;
    }

    const employee = employeeResult.data;

    // Check if employee is active
    if (!employee.active) {
      res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
      return;
    }

    // Attach employee to request
    (req as any).user = employee;

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
