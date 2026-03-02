// src/modules/auth/auth.service.ts
import jwt from "jsonwebtoken";
import { StringValue } from "ms";
import {
  ChangePasswordInput,
  LoginInput,
  RegisterEmployeeInput,
  RegisterCustomerInput,
} from "./auth.schema";
import employeeService from "../employee/employee.service";
import customerService from "../customer/customer.service";
import { EmployeeResponse } from "../employee/employee.schema";
import { CustomerResponse } from "../customer/customer.schema";
import { comparePasswords, hashPassword } from "../../utils/encryption";
import prisma from "../../config/database";

/**
 * Service Response Type
 */
type ServiceResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Auth Response Type
 */
interface AuthResponse {
  user: EmployeeResponse | CustomerResponse;
  token: string;
  refreshToken?: string;
  userType: "employee" | "customer";
}

/**
 * Token Payload Interface
 * Includes restaurantId for multi-tenancy
 */
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  restaurantId: string | null;
}

/**
 * AuthService Class
 *
 * Responsibilities:
 * - User authentication for both employee and customer (login)
 * - Token generation and validation
 * - Password verification
 * - Delegates employee creation to EmployeeService (internal process by admin only)
 * - Delegates customer creation to CustomerService
 */
class AuthService {
  /**
   * Register a new employee (ADMIN ONLY usually, but keeping as service method)
   */
  async registerEmployee(
    data: RegisterEmployeeInput,
  ): Promise<ServiceResponse<AuthResponse>> {
    try {
      // Delegate employee creation to EmployeeService
      const employeeResult = await employeeService.createEmployee({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
      });

      if (!employeeResult.success) {
        return {
          success: false,
          error: employeeResult.error,
        };
      }

      // Generate tokens
      const token = this.generateAccessToken({
        userId: employeeResult.data.id,
        email: employeeResult.data.email,
        role: employeeResult.data.role,
        restaurantId: employeeResult.data.restaurantId,
      });

      const refreshToken = this.generateRefreshToken({
        userId: employeeResult.data.id,
        email: employeeResult.data.email,
        role: employeeResult.data.role,
        restaurantId: employeeResult.data.restaurantId,
      });

      return {
        success: true,
        data: {
          user: employeeResult.data,
          token,
          refreshToken,
          userType: "employee",
        },
      };
    } catch (error) {
      console.error("Employee registration error:", error);
      return {
        success: false,
        error: "Registration failed. Please try again.",
      };
    }
  }

  /**
   * Register a new customer
   */
  async registerCustomer(
    data: RegisterCustomerInput,
  ): Promise<ServiceResponse<AuthResponse>> {
    try {
      // Delegate customer creation to CustomerService
      const customerResult = await customerService.createCustomer(data);

      if (!customerResult.success) {
        return {
          success: false,
          error: customerResult.error,
        };
      }

      // Generate tokens
      // Customers don't have a role like employees, or we can assign 'CUSTOMER'
      const token = this.generateAccessToken({
        userId: customerResult.data.id,
        email: customerResult.data.email,
        role: "CUSTOMER",
        restaurantId: customerResult.data.restaurantId,
      });

      const refreshToken = this.generateRefreshToken({
        userId: customerResult.data.id,
        email: customerResult.data.email,
        role: "CUSTOMER",
        restaurantId: customerResult.data.restaurantId,
      });

      return {
        success: true,
        data: {
          user: customerResult.data,
          token,
          refreshToken,
          userType: "customer",
        },
      };
    } catch (error) {
      console.error("Customer registration error:", error);
      return {
        success: false,
        error: "Registration failed. Please try again.",
      };
    }
  }

  /**
   * Login employee
   */
  async loginEmployee(
    data: LoginInput,
  ): Promise<ServiceResponse<AuthResponse>> {
    try {
      // Get employee with password via EmployeeService
      const employeeResult = await employeeService.getEmployeeByEmail(
        data.email,
        true,
      );

      if (!employeeResult.success) {
        return {
          success: false,
          error: "Invalid credentials",
        };
      }

      const employee = employeeResult.data;

      // Check if employee is active
      if (!employee.active) {
        return {
          success: false,
          error: "Account is deactivated. Please contact support.",
        };
      }

      // Verify password
      const isPasswordValid = await comparePasswords(
        data.password,
        employee.password!,
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Invalid credentials",
        };
      }

      // Remove password from response
      const { password, ...employeeWithoutPassword } = employee;

      // Generate tokens
      const token = this.generateAccessToken({
        userId: employee.id,
        email: employee.email,
        role: employee.role,
        restaurantId: employee.restaurantId,
      });

      const refreshToken = this.generateRefreshToken({
        userId: employee.id,
        email: employee.email,
        role: employee.role,
        restaurantId: employee.restaurantId,
      });

      return {
        success: true,
        data: {
          user: employeeWithoutPassword,
          token,
          refreshToken,
          userType: "employee",
        },
      };
    } catch (error) {
      console.error("Employee login error:", error);
      return {
        success: false,
        error: "Login failed. Please try again.",
      };
    }
  }

  /**
   * Login customer
   */
  async loginCustomer(
    data: LoginInput,
  ): Promise<ServiceResponse<AuthResponse>> {
    try {
      // Get customer with password via CustomerService
      const customerResult = await customerService.getCustomerByEmail(
        data.email,
        true,
      );

      if (!customerResult.success) {
        return {
          success: false,
          error: "Invalid credentials",
        };
      }

      const customer = customerResult.data;

      // Check if customer is active
      if (!customer.active) {
        return {
          success: false,
          error: "Account is deactivated. Please contact support.",
        };
      }

      // Verify password
      const isPasswordValid = await comparePasswords(
        data.password,
        customer.password!,
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Invalid credentials",
        };
      }

      // Remove password from response
      const { password, ...customerWithoutPassword } = customer;

      // Generate tokens
      const token = this.generateAccessToken({
        userId: customer.id,
        email: customer.email,
        role: "CUSTOMER",
        restaurantId: customer.restaurantId,
      });

      const refreshToken = this.generateRefreshToken({
        userId: customer.id,
        email: customer.email,
        role: "CUSTOMER",
        restaurantId: customer.restaurantId,
      });

      return {
        success: true,
        data: {
          user: customerWithoutPassword,
          token,
          refreshToken,
          userType: "customer",
        },
      };
    } catch (error) {
      console.error("Customer login error:", error);
      return {
        success: false,
        error: "Login failed. Please try again.",
      };
    }
  }

  /**
   * Verify JWT token and return payload
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error("JWT_SECRET is not defined");
      }

      const decoded = jwt.verify(token, secret) as TokenPayload;
      return decoded;
    } catch (error) {
      console.error("Token verification error:", error);
      return null;
    }
  }

  /**
   * Generate Access Token (short-lived)
   */
  private generateAccessToken(payload: TokenPayload): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    const expiresIn: StringValue | number =
      (process.env.JWT_EXPIRE as StringValue) || "15m";

    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        restaurantId: payload.restaurantId,
      },
      secret,
      { expiresIn },
    );
  }

  /**
   * Generate Refresh Token (long-lived)
   * TODO: Store in database for revocation capability
   */
  private generateRefreshToken(payload: TokenPayload): string {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_REFRESH_SECRET is not defined");
    }

    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        restaurantId: payload.restaurantId,
      },
      secret,
      { expiresIn: "7d" },
    );
  }

  /**
   * Refresh Access Token using Refresh Token
   * TODO: Implement when refresh token endpoint is added
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<ServiceResponse<{ token: string }>> {
    try {
      const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
      if (!secret) {
        throw new Error("JWT_REFRESH_SECRET is not defined");
      }

      const decoded = jwt.verify(refreshToken, secret) as TokenPayload;

      // Generate new access token
      const newToken = this.generateAccessToken({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        restaurantId: decoded.restaurantId,
      });

      return {
        success: true,
        data: { token: newToken },
      };
    } catch (error) {
      console.error("Token refresh error:", error);
      return {
        success: false,
        error: "Invalid or expired refresh token",
      };
    }
  }

  /**
   * Change password for authenticated user
   * Requires current password verification
   */
  async changePassword(
    userId: string,
    userKind: "employee" | "customer",
    data: ChangePasswordInput,
  ): Promise<ServiceResponse<{ message: string }>> {
    try {
      // Get user with password
      let userWithPassword;

      if (userKind === "employee") {
        const employeeResult = await employeeService.getEmployeeById(userId, true);
        if (!employeeResult.success) {
          return { success: false, error: "User not found" };
        }
        userWithPassword = employeeResult.data;
      } else {
        const customerResult = await customerService.getCustomerById(userId, true);
        if (!customerResult.success) {
          return { success: false, error: "User not found" };
        }
        userWithPassword = customerResult.data;
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePasswords(
        data.currentPassword,
        userWithPassword.password!,
      );

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: "Current password is incorrect",
        };
      }

      // Hash new password
      const hashedPassword = await hashPassword(data.newPassword);

      // Update password in database
      if (userKind === "employee") {
        await prisma.employee.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });
      } else {
        await prisma.customer.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });
      }

      return {
        success: true,
        data: { message: "Password changed successfully" },
      };
    } catch (error) {
      console.error("Change password error:", error);
      return {
        success: false,
        error: "Failed to change password. Please try again.",
      };
    }
  }
}

export default new AuthService();
