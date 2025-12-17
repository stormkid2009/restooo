// src/services/authService.ts
import prisma from "../config/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { StringValue } from "ms";
import { RegisterInput, LoginInput } from "../validators/authValidator";

/**
 * Service Response Type
 *
 * Generic type that ensures consistent response structure
 * Either success with data OR error with message, never both
 */
type ServiceResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * User Response Type (without password)
 * Used for type safety when returning user data
 */
interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Auth Response Type
 * What we return after successful registration or login
 */
interface AuthResponse {
  user: UserResponse;
  token: string;
}

/**
 * AuthService Class
 *
 * Handles all authentication business logic:
 * - User registration with password hashing
 * - User login with credential verification
 * - JWT token generation
 *
 * Uses class-based approach for better organization
 * Private methods are only accessible within this class
 */
class AuthService {
  /**
   * Register a new user
   *
   * Process:
   * 1. Check if email already exists (prevent duplicates)
   * 2. Hash the password using bcrypt (10 rounds)
   * 3. Create user in database via Prisma
   * 4. Remove password from response (security)
   * 5. Generate JWT token for auto-login
   * 6. Return user + token
   *
   * @param data - Validated registration data from request
   * @returns ServiceResponse with user and token, or error message
   */
  async register(data: RegisterInput): Promise<ServiceResponse<AuthResponse>> {
    try {
      // Step 1: Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return {
          success: false,
          error: "Email already exists",
        };
      }

      // Step 2: Hash the password (never store plain passwords!)
      // bcrypt.hash is async because it's CPU-intensive
      const hashedPassword = await this.hashPassword(data.password);

      // Step 3: Create user in database
      // If role is not provided, Prisma will use default (STAFF)
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: data.role || "STAFF", // Use provided role or default to STAFF
        },
      });

      // Step 4: Remove password from response
      // IMPORTANT: Never send password (even hashed) to client
      const { password, ...userWithoutPassword } = user;

      // Step 5: Generate JWT token for immediate login
      const token = this.generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Step 6: Return success response
      return {
        success: true,
        data: {
          user: userWithoutPassword,
          token,
        },
      };
    } catch (error) {
      // Handle any unexpected database or system errors
      console.error("Registration error:", error);
      return {
        success: false,
        error: "Failed to create user. Please try again.",
      };
    }
  }

  /**
   * Login existing user
   *
   * Process:
   * 1. Find user by email
   * 2. Verify user exists
   * 3. Compare provided password with stored hash
   * 4. Verify password matches
   * 5. Remove password from response
   * 6. Generate JWT token
   * 7. Return user + token
   *
   * Security Note: We use same error message for "user not found" and
   * "wrong password" to prevent attackers from discovering valid emails
   *
   * @param data - Validated login data from request
   * @returns ServiceResponse with user and token, or error message
   */
  async login(data: LoginInput): Promise<ServiceResponse<AuthResponse>> {
    try {
      // Step 1: Find user by email in database
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      // Step 2: Check if user exists
      // If not, return generic error (don't reveal "user not found")
      if (!user) {
        return {
          success: false,
          error: "Invalid credentials", // Generic message for security
        };
      }

      // Step 3: Compare provided password with stored hash
      // bcrypt.compare is async and CPU-intensive
      const isPasswordValid = await this.comparePasswords(
        data.password,
        user.password,
      );

      // Step 4: Check if password matches
      // If not, return same generic error
      if (!isPasswordValid) {
        return {
          success: false,
          error: "Invalid credentials", // Same message as above
        };
      }

      // Step 5: Remove password from response
      const { password, ...userWithoutPassword } = user;

      // Step 6: Generate JWT token for authenticated session
      const token = this.generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Step 7: Return success response
      return {
        success: true,
        data: {
          user: userWithoutPassword,
          token,
        },
      };
    } catch (error) {
      // Handle any unexpected database or system errors
      console.error("Login error:", error);
      return {
        success: false,
        error: "Login failed. Please try again.",
      };
    }
  }

  /**
   * Hash password using bcrypt
   *
   * Private method - only used internally by this class
   *
   * Process:
   * - Generates random salt
   * - Hashes password with salt
   * - Returns hash string like: "$2b$10$N9qo8uLOickgx..."
   *
   * Why async? bcrypt.hash is CPU-intensive and runs in thread pool
   * to avoid blocking the event loop
   *
   * @param password - Plain text password to hash
   * @returns Hashed password string
   */
  private async hashPassword(password: string): Promise<string> {
    // 10 = salt rounds (2^10 = 1024 iterations)
    // More rounds = more secure but slower
    // 10 rounds = ~100ms, good balance for most apps
    return await bcrypt.hash(password, 10);
  }

  /**
   * Compare plain password with hashed password
   *
   * Private method - only used internally by this class
   *
   * How it works:
   * - bcrypt extracts the salt from the stored hash
   * - Hashes the plain password with same salt
   * - Compares the two hashes
   *
   * Why async? Same reason as hash - CPU-intensive operation
   *
   * @param plainPassword - Password provided by user
   * @param hashedPassword - Stored hash from database
   * @returns true if passwords match, false otherwise
   */
  private async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Generate JWT token
   *
   * Private method - only used internally by this class
   *
   * Token structure:
   * - Header: { alg: "HS256", typ: "JWT" }
   * - Payload: { userId, email, role, iat, exp }
   * - Signature: HMACSHA256(header + payload, secret)
   *
   * Token is NOT encrypted - anyone can decode and read it
   * But signature prevents tampering - can't modify without secret
   *
   * Why not async? jwt.sign is synchronous operation
   *
   * @param user - User data to include in token payload
   * @returns JWT token string
   */
  private generateToken(user: {
    id: string;
    email: string;
    role?: string; // make it optional to match schema reality
  }): string {
    // Create minimal payload (smaller token = faster transmission)
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role ?? "STAFF", // Default in case of undefined
    };

    // Sign the token with secret from environment variables
    // ! tells TypeScript we're sure JWT_SECRET exists (we check in .env)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    // Cast to StringValue for type safety
    const expiresIn: StringValue | number | undefined =
      (process.env.JWT_EXPIRE as StringValue) || "7d";

    return jwt.sign(payload, secret, { expiresIn });
  }
}

// Export single instance of the service
// This creates a singleton - same instance used throughout the app
export default new AuthService();
