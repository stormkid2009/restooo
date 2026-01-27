// src/modules/auth/auth.service.ts
import jwt from "jsonwebtoken";
import { StringValue } from "ms";
import { LoginInput, RegisterInput } from "./auth.schema";
import userService from "../user/user.service";
import { UserResponse } from "../user/user.schema";
import { comparePasswords } from "../../utils/encryption";

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
  user: UserResponse;
  token: string;
  refreshToken?: string;
}

/**
 * Token Payload Interface
 */
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * AuthService Class
 *
 * Responsibilities:
 * - User authentication (login)
 * - Token generation and validation
 * - Password verification
 * - Delegates user creation to UserService
 */
class AuthService {
  /**
   * Register a new user
   *
   * Delegates user creation to UserService
   * Only handles token generation after user is created
   */
  async register(data: RegisterInput): Promise<ServiceResponse<AuthResponse>> {
    try {
      // Delegate user creation to UserService
      const userResult = await userService.createUser({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
      });

      if (!userResult.success) {
        return {
          success: false,
          error: userResult.error,
        };
      }

      // Generate tokens for immediate login
      const token = this.generateAccessToken({
        userId: userResult.data.id,
        email: userResult.data.email,
        role: userResult.data.role,
      });

      return {
        success: true,
        data: {
          user: userResult.data,
          token,
        },
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: "Registration failed. Please try again.",
      };
    }
  }

  /**
   * Login existing user
   *
   * Process:
   * 1. Get user via UserService
   * 2. Verify password
   * 3. Generate tokens
   */
  async login(data: LoginInput): Promise<ServiceResponse<AuthResponse>> {
    try {
      // Get user with password via UserService
      const userResult = await userService.getUserByEmail(data.email, true);

      if (!userResult.success) {
        return {
          success: false,
          error: "Invalid credentials",
        };
      }

      const user = userResult.data;

      // Check if user is active
      if (!user.active) {
        return {
          success: false,
          error: "Account is deactivated. Please contact support.",
        };
      }

      // Verify password
      const isPasswordValid = await comparePasswords(
        data.password,
        user.password!,
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Invalid credentials",
        };
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      // Generate tokens
      const token = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        success: true,
        data: {
          user: userWithoutPassword,
          token,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
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
}

export default new AuthService();
