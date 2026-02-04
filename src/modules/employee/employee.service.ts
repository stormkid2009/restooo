// src/modules/employee/employee.service.ts
import prisma from "../../config/database";
import { hashPassword } from "../../utils/encryption";
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeQueryInput,
  EmployeeResponse,
} from "./employee.schema";

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
 * Employee with Password (internal use only)
 */
interface EmployeeWithPassword extends EmployeeResponse {
  password: string;
}

/**
 * EmployeeService Class
 *
 * Responsibilities:
 * - Employee CRUD operations
 * - Employee search and filtering
 * - Employee activation/deactivation
 */
class EmployeeService {
  /**
   * Create a new employee
   * Used by auth service for registration and by admins
   */
  async createEmployee(
    data: CreateEmployeeInput
  ): Promise<ServiceResponse<EmployeeResponse>> {
    try {
      // Check if employee already exists
      const existingEmployee = await prisma.employee.findUnique({
        where: { email: data.email },
      });

      if (existingEmployee) {
        return {
          success: false,
          error: "Email already exists",
        };
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create employee
      const employee = await prisma.employee.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          phone: data.phone,
          role: data.role || "STAFF",
          shift: data.shift,
          restaurantId: data.restaurantId,
          active: data.active ?? true,
        },
      });

      // Remove password from response
      const { password, ...employeeWithoutPassword } = employee;

      return {
        success: true,
        data: employeeWithoutPassword,
      };
    } catch (error) {
      console.error("Create employee error:", error);
      return {
        success: false,
        error: "Failed to create employee. Please try again.",
      };
    }
  }

  /**
   * Get employee by ID (with function overloads for type safety)
   */
  async getEmployeeById(
    employeeId: string,
    includePassword: true
  ): Promise<ServiceResponse<EmployeeWithPassword>>;
  async getEmployeeById(
    employeeId: string,
    includePassword?: false
  ): Promise<ServiceResponse<EmployeeResponse>>;
  async getEmployeeById(
    employeeId: string,
    includePassword: boolean = false
  ): Promise<ServiceResponse<EmployeeResponse | EmployeeWithPassword>> {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });

      if (!employee) {
        return {
          success: false,
          error: "Employee not found",
        };
      }

      if (!includePassword) {
        const { password, ...employeeWithoutPassword } = employee;
        return {
          success: true,
          data: employeeWithoutPassword,
        };
      }

      return {
        success: true,
        data: employee,
      };
    } catch (error) {
      console.error("Get employee error:", error);
      return {
        success: false,
        error: "Failed to fetch employee",
      };
    }
  }

  /**
   * Get employee by email (with function overloads for type safety)
   * Used by auth service for login
   */
  async getEmployeeByEmail(
    email: string,
    includePassword: true
  ): Promise<ServiceResponse<EmployeeWithPassword>>;
  async getEmployeeByEmail(
    email: string,
    includePassword?: false
  ): Promise<ServiceResponse<EmployeeResponse>>;
  async getEmployeeByEmail(
    email: string,
    includePassword: boolean = false
  ): Promise<ServiceResponse<EmployeeResponse | EmployeeWithPassword>> {
    try {
      const employee = await prisma.employee.findUnique({
        where: { email },
      });

      if (!employee) {
        return {
          success: false,
          error: "Employee not found",
        };
      }

      if (!includePassword) {
        const { password, ...employeeWithoutPassword } = employee;
        return {
          success: true,
          data: employeeWithoutPassword,
        };
      }

      return {
        success: true,
        data: employee,
      };
    } catch (error) {
      console.error("Get employee by email error:", error);
      return {
        success: false,
        error: "Failed to fetch employee",
      };
    }
  }

  /**
   * Get all employees with filtering and pagination
   * Scoped to restaurantId if provided
   */
  async getEmployees(
    query: EmployeeQueryInput,
    restaurantId?: string
  ): Promise<ServiceResponse<PaginatedResponse<EmployeeResponse>>> {
    try {
      const { page, limit, role, active, search, sortBy, sortOrder } = query;

      // Build where clause
      const where: any = {
        deletedAt: null, // Only get non-soft-deleted employees
      };

      // Scope to restaurant if provided
      if (restaurantId) {
        where.restaurantId = restaurantId;
      }

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
      const total = await prisma.employee.count({ where });

      // Get paginated employees
      const employees = await prisma.employee.findMany({
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
          phone: true,
          role: true,
          shift: true,
          hireDate: true,
          active: true,
          restaurantId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        data: {
          data: employees,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error("Get employees error:", error);
      return {
        success: false,
        error: "Failed to fetch employees",
      };
    }
  }

  /**
   * Update employee by ID (admin operation)
   */
  async updateEmployee(
    employeeId: string,
    data: UpdateEmployeeInput
  ): Promise<ServiceResponse<EmployeeResponse>> {
    try {
      // Check if employee exists
      const existingEmployee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });

      if (!existingEmployee) {
        return {
          success: false,
          error: "Employee not found",
        };
      }

      // If email is being updated, check for duplicates
      if (data.email && data.email !== existingEmployee.email) {
        const emailExists = await prisma.employee.findUnique({
          where: { email: data.email },
        });

        if (emailExists) {
          return {
            success: false,
            error: "Email already in use",
          };
        }
      }

      // Update employee
      const updatedEmployee = await prisma.employee.update({
        where: { id: employeeId },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          shift: true,
          hireDate: true,
          active: true,
          restaurantId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        data: updatedEmployee,
      };
    } catch (error) {
      console.error("Update employee error:", error);
      return {
        success: false,
        error: "Failed to update employee",
      };
    }
  }

  /**
   * Soft delete employee by ID (sets deletedAt)
   */
  async deleteEmployee(employeeId: string): Promise<ServiceResponse<void>> {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });

      if (!employee) {
        return {
          success: false,
          error: "Employee not found",
        };
      }

      // Soft delete by setting deletedAt
      await prisma.employee.update({
        where: { id: employeeId },
        data: { deletedAt: new Date() },
      });

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      console.error("Delete employee error:", error);
      return {
        success: false,
        error: "Failed to delete employee",
      };
    }
  }

  /**
   * Hard delete employee (permanent removal)
   * Use with extreme caution
   */
  async hardDeleteEmployee(employeeId: string): Promise<ServiceResponse<void>> {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });

      if (!employee) {
        return {
          success: false,
          error: "Employee not found",
        };
      }

      await prisma.employee.delete({
        where: { id: employeeId },
      });

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      console.error("Hard delete employee error:", error);
      return {
        success: false,
        error: "Failed to permanently delete employee",
      };
    }
  }

  /**
   * Activate employee
   */
  async activateEmployee(employeeId: string): Promise<ServiceResponse<EmployeeResponse>> {
    return this.updateEmployee(employeeId, { active: true });
  }

  /**
   * Deactivate employee
   */
  async deactivateEmployee(
    employeeId: string
  ): Promise<ServiceResponse<EmployeeResponse>> {
    return this.updateEmployee(employeeId, { active: false });
  }

  /**
   * Change employee role
   */
  async changeEmployeeRole(
    employeeId: string,
    newRole: "ADMIN" | "MANAGER" | "STAFF" | "CHEF"
  ): Promise<ServiceResponse<EmployeeResponse>> {
    return this.updateEmployee(employeeId, { role: newRole });
  }
}

export default new EmployeeService();