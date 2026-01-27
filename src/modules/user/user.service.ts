// src/modules/user/user.service.ts
import prisma from "../../config/database";
import { hashPassword } from "../../utils/encryption";
import {
  CreateUserInput,
  UpdateUserInput,
  UpdateProfileInput,
  UserQueryInput,
  UserResponse,
} from "./user.schema";

/**
 * Service Response Type
 */
type ServiceResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Paginated Response Type
 */
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * User with Password (internal use only)
 */
interface UserWithPassword extends UserResponse {
  password: string;
}

/**
 * UserService Class
 * 
 * Responsibilities:
 * - User CRUD operations
 * - User search and filtering
 * - Profile management
 * - User activation/deactivation
 */
class UserService {
  /**
   * Create a new user
   * Used by auth service for registration and by admins
   */
  async createUser(
    data: CreateUserInput
  ): Promise<ServiceResponse<UserResponse>> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return {
          success: false,
          error: "Email already exists",
        };
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: data.role || "STAFF",
          active: data.active ?? true,
        },
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      return {
        success: true,
        data: userWithoutPassword,
      };
    } catch (error) {
      console.error("Create user error:", error);
      return {
        success: false,
        error: "Failed to create user. Please try again.",
      };
    }
  }

  /**
   * Get user by ID (with function overloads for type safety)
   */
  async getUserById(
    userId: string,
    includePassword: true
  ): Promise<ServiceResponse<UserWithPassword>>;
  async getUserById(
    userId: string,
    includePassword?: false
  ): Promise<ServiceResponse<UserResponse>>;
  async getUserById(
    userId: string,
    includePassword: boolean = false
  ): Promise<ServiceResponse<UserResponse | UserWithPassword>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      if (!includePassword) {
        const { password, ...userWithoutPassword } = user;
        return {
          success: true,
          data: userWithoutPassword,
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      console.error("Get user error:", error);
      return {
        success: false,
        error: "Failed to fetch user",
      };
    }
  }

  /**
   * Get user by email (with function overloads for type safety)
   * Used by auth service for login
   */
  async getUserByEmail(
    email: string,
    includePassword: true
  ): Promise<ServiceResponse<UserWithPassword>>;
  async getUserByEmail(
    email: string,
    includePassword?: false
  ): Promise<ServiceResponse<UserResponse>>;
  async getUserByEmail(
    email: string,
    includePassword: boolean = false
  ): Promise<ServiceResponse<UserResponse | UserWithPassword>> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      if (!includePassword) {
        const { password, ...userWithoutPassword } = user;
        return {
          success: true,
          data: userWithoutPassword,
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      console.error("Get user by email error:", error);
      return {
        success: false,
        error: "Failed to fetch user",
      };
    }
  }

  /**
   * Get all users with filtering and pagination
   */
  async getUsers(
    query: UserQueryInput
  ): Promise<ServiceResponse<PaginatedResponse<UserResponse>>> {
    try {
      const { page, limit, role, active, search, sortBy, sortOrder } = query;

      // Build where clause
      const where: any = {};

      if (role) {
        where.role = role;
      }

      if (active !== undefined) {
        where.active = active;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      // Get total count
      const total = await prisma.user.count({ where });

      // Get paginated users
      const users = await prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        data: {
          data: users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error("Get users error:", error);
      return {
        success: false,
        error: "Failed to fetch users",
      };
    }
  }

  /**
   * Update user by ID (admin operation)
   */
  async updateUser(
    userId: string,
    data: UpdateUserInput
  ): Promise<ServiceResponse<UserResponse>> {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // If email is being updated, check for duplicates
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: data.email },
        });

        if (emailExists) {
          return {
            success: false,
            error: "Email already in use",
          };
        }
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        data: updatedUser,
      };
    } catch (error) {
      console.error("Update user error:", error);
      return {
        success: false,
        error: "Failed to update user",
      };
    }
  }

  /**
   * Update user profile (self-update with limited fields)
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileInput
  ): Promise<ServiceResponse<UserResponse>> {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // If email is being updated, check for duplicates
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: data.email },
        });

        if (emailExists) {
          return {
            success: false,
            error: "Email already in use",
          };
        }
      }

      // Update profile
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        data: updatedUser,
      };
    } catch (error) {
      console.error("Update profile error:", error);
      return {
        success: false,
        error: "Failed to update profile",
      };
    }
  }

  /**
   * Delete user by ID (soft delete - set active to false)
   */
  async deleteUser(userId: string): Promise<ServiceResponse<void>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Soft delete by setting active to false
      await prisma.user.update({
        where: { id: userId },
        data: { active: false },
      });

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      console.error("Delete user error:", error);
      return {
        success: false,
        error: "Failed to delete user",
      };
    }
  }

  /**
   * Hard delete user (permanent removal)
   * Use with extreme caution
   */
  async hardDeleteUser(userId: string): Promise<ServiceResponse<void>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      console.error("Hard delete user error:", error);
      return {
        success: false,
        error: "Failed to permanently delete user",
      };
    }
  }

  /**
   * Activate user
   */
  async activateUser(userId: string): Promise<ServiceResponse<UserResponse>> {
    return this.updateUser(userId, { active: true });
  }

  /**
   * Deactivate user
   */
  async deactivateUser(
    userId: string
  ): Promise<ServiceResponse<UserResponse>> {
    return this.updateUser(userId, { active: false });
  }

  /**
   * Change user role
   */
  async changeUserRole(
    userId: string,
    newRole: "ADMIN" | "MANAGER" | "STAFF" | "CHEF"
  ): Promise<ServiceResponse<UserResponse>> {
    return this.updateUser(userId, { role: newRole });
  }
}

export default new UserService();