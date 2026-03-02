
// src/modules/customer/customer.service.ts
import prisma from "../../config/database";
import { hashPassword } from "../../utils/encryption";
import {
    CreateCustomerInput,
    CustomerQueryInput,
    UpdateCustomerInput,
    CustomerResponse,
} from "./customer.schema";

/**
 * Service Response Type
 */
type ServiceResponse<T> =
    | { success: true; data: T }
    | { success: false; error: string };

class CustomerService {
    /**
     * Create a new customer
     */
    async createCustomer(
        data: CreateCustomerInput
    ): Promise<ServiceResponse<CustomerResponse>> {
        try {
            // Check if email already exists
            const existingEmail = await prisma.customer.findUnique({
                where: { email: data.email },
            });

            if (existingEmail) {
                return {
                    success: false,
                    error: "Email is already registered",
                };
            }

            // Check if phone already exists
            const existingPhone = await prisma.customer.findUnique({
                where: { phone: data.phone },
            });

            if (existingPhone) {
                return {
                    success: false,
                    error: "Phone number is already registered",
                };
            }

            // Hash password
            const hashedPassword = await hashPassword(data.password);

            // Create customer
            const customer = await prisma.customer.create({
                data: {
                    ...data,
                    password: hashedPassword,
                },
            });

            // Remove password from response
            const { password, ...customerData } = customer;

            return {
                success: true,
                data: customerData,
            };
        } catch (error) {
            console.error("Create customer error:", error);
            return {
                success: false,
                error: "Failed to create customer",
            };
        }
    }

    /**
     * Get customer by ID
     */
    async getCustomerById(
        id: string,
        includePassword = false
    ): Promise<ServiceResponse<CustomerResponse & { password?: string }>> {
        try {
            const customer = await prisma.customer.findUnique({
                where: { id, deletedAt: null },
            });

            if (!customer) {
                return {
                    success: false,
                    error: "Customer not found",
                };
            }

            if (includePassword) {
                return {
                    success: true,
                    data: customer as CustomerResponse & { password?: string },
                };
            }

            const { password, ...customerData } = customer;

            return {
                success: true,
                data: customerData as CustomerResponse,
            };
        } catch (error) {
            console.error("Get customer error:", error);
            return {
                success: false,
                error: "Failed to fetch customer",
            };
        }
    }

    /**
     * Get customer by email (Internal use for auth)
     */
    async getCustomerByEmail(
        email: string,
        includePassword = false
    ): Promise<ServiceResponse<CustomerResponse & { password?: string }>> {
        try {
            const customer = await prisma.customer.findUnique({
                where: { email, deletedAt: null },
            });

            if (!customer) {
                return {
                    success: false,
                    error: "Customer not found",
                };
            }

            if (includePassword) {
                return {
                    success: true,
                    data: customer as CustomerResponse & { password?: string },
                };
            }

            const { password, ...customerData } = customer;
            return {
                success: true,
                data: customerData as CustomerResponse,
            };
        } catch (error) {
            console.error("Get customer by email error:", error);
            return {
                success: false,
                error: "Failed to fetch customer",
            };
        }
    }

    /**
     * Get customers with filtering (Admin)
     */
    async getCustomers(
        query: CustomerQueryInput,
        restaurantId?: string
    ): Promise<ServiceResponse<{ customers: CustomerResponse[]; total: number; pages: number }>> {
        try {
            const {
                page = 1,
                limit = 10,
                active,
                search,
                sortBy = "createdAt",
                sortOrder = "desc",
            } = query;

            const skip = (page - 1) * limit;

            const where: any = {
                deletedAt: null,
            };

            // Filter by restaurant if provided
            if (restaurantId) {
                where.restaurantId = restaurantId;
            }

            // Filter by active status
            if (active !== undefined) {
                where.active = active;
            }

            // Search (name, email, phone)
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } },
                ];
            }

            const [customers, total] = await Promise.all([
                prisma.customer.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { [sortBy]: sortOrder },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        phone: true,
                        loyaltyPoints: true,
                        active: true,
                        restaurantId: true,
                        createdAt: true,
                        updatedAt: true,
                        // Exclude password
                    },
                }),
                prisma.customer.count({ where }),
            ]);

            return {
                success: true,
                data: {
                    customers: customers as CustomerResponse[],
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            console.error("Get customers error:", error);
            return {
                success: false,
                error: "Failed to fetch customers",
            };
        }
    }

    /**
     * Update customer
     */
    async updateCustomer(
        id: string,
        data: UpdateCustomerInput
    ): Promise<ServiceResponse<CustomerResponse>> {
        try {
            // check if exists
            const existing = await prisma.customer.findUnique({
                where: { id, deletedAt: null },
            });

            if (!existing) {
                return {
                    success: false,
                    error: "Customer not found",
                };
            }

            // If email is changing, check uniqueness
            if (data.email && data.email !== existing.email) {
                const emailCheck = await prisma.customer.findUnique({
                    where: { email: data.email },
                });
                if (emailCheck) {
                    return { success: false, error: "Email already in use" };
                }
            }

            const updated = await prisma.customer.update({
                where: { id },
                data,
            });

            const { password, ...customerData } = updated;

            return {
                success: true,
                data: customerData as CustomerResponse,
            };
        } catch (error) {
            console.error("Update customer error:", error);
            return {
                success: false,
                error: "Failed to update customer",
            };
        }
    }

    /**
     * Delete customer (soft delete)
     */
    async deleteCustomer(id: string): Promise<ServiceResponse<void>> {
        try {
            const existing = await prisma.customer.findUnique({
                where: { id, deletedAt: null },
            });

            if (!existing) {
                return {
                    success: false,
                    error: "Customer not found",
                };
            }

            await prisma.customer.update({
                where: { id },
                data: { deletedAt: new Date(), active: false },
            });

            return {
                success: true,
                data: undefined,
            };
        } catch (error) {
            console.error("Delete customer error:", error);
            return {
                success: false,
                error: "Failed to delete customer",
            };
        }
    }
}

export default new CustomerService();
