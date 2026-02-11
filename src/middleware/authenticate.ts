import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import employeeService from "../modules/employee/employee.service";
import customerService from "../modules/customer/customer.service";
import { CustomerResponse } from "../modules/customer/customer.schema";

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
 * Extended Request with customer info
 */
export type CustomerAuthRequest = Request & {
    user: CustomerResponse;
};

/**
 * JWT Payload Interface
 * Includes restaurantId for multi-tenancy
 */
interface JWTPayload {
  userId: string;
  email: string;
  role?: string; // Optional because customer might not have role in payload
  restaurantId?: string | null; // Optional
  iat: number;
  exp: number;
}

interface AuthOptions {
    type: 'employee' | 'customer';
}

/**
 * Create Authentication Middleware
 * 
 * Factory function to create authentication middleware for different user types
 */
const createAuthMiddleware = (options: AuthOptions) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

            // Get fresh user data from database based on type
            if (options.type === 'employee') {
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

            } else if (options.type === 'customer') {
                const customerResult = await customerService.getCustomerById(decoded.userId);

                if (!customerResult.success) {
                    res.status(401).json({
                        success: false,
                        message: "Customer not found",
                    });
                    return;
                }

                const customer = customerResult.data;

                // Check if customer is active
                if (!customer.active) {
                    res.status(403).json({
                        success: false,
                        message: "Account is deactivated. Please contact support.",
                    });
                    return;
                }

                // Attach customer to request
                (req as any).user = customer;
            }

            next();
        } catch (error) {
            console.error("Authentication error:", error);
            res.status(500).json({
                success: false,
                message: "Authentication failed",
            });
        }
    };
};

/**
 * Authenticate Middleware (Employee)
 *
 * Verifies JWT token and attaches employee to request
 */
export const authenticate = createAuthMiddleware({ type: 'employee' });

/**
 * Authenticate Middleware (Customer)
 * 
 * Verifies JWT token and attaches customer to request
 */
export const authenticateCustomer = createAuthMiddleware({ type: 'customer' });

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
