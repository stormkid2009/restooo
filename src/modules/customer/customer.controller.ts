
// src/modules/customer/customer.controller.ts
import { Request, Response } from "express";
import customerService from "./customer.service";
import {
    CreateCustomerInput,
    UpdateCustomerInput,
    CustomerQueryInput,
} from "./customer.schema";
import { CustomerAuthRequest } from "../../middleware/authenticate";

class CustomerController {
    /**
     * Register a new customer
     * POST /api/v1/customer
     * Public
     */
    async register(req: Request, res: Response): Promise<void> {
        try {
            const data: CreateCustomerInput = req.body;
            const result = await customerService.createCustomer(data);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    message: result.error,
                });
                return;
            }

            // TODO: In a real app we might login immediately and return token
            // For now just return the created customer
            res.status(201).json({
                success: true,
                message: "Customer registered successfully",
                data: result.data,
            });
        } catch (error) {
            console.error("Register customer error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }

    /**
     * Get current authenticated customer
     * GET /api/v1/customer/me
     * Auth required
     */
    async getMe(req: Request, res: Response): Promise<void> {
        try {
            // User is attached by authenticateCustomer middleware
            const customer = (req as CustomerAuthRequest).user;

            res.status(200).json({
                success: true,
                data: customer,
            });
        } catch (error) {
            console.error("Get me error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }

    /**
     * Update current authenticated customer
     * PUT /api/v1/customer/me
     * Auth required
     */
    async updateMe(req: Request, res: Response): Promise<void> {
        try {
            const customer = (req as CustomerAuthRequest).user;
            const data: UpdateCustomerInput = req.body;

            const result = await customerService.updateCustomer(customer.id, data);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    message: result.error,
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                data: result.data,
            });
        } catch (error) {
            console.error("Update me error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }

    /**
     * Get all customers (Admin)
     * GET /api/v1/customer
     * Admin required
     */
    async getCustomers(req: Request, res: Response): Promise<void> {
        try {
            const query: CustomerQueryInput = {
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 10,
                active: req.query.active ? req.query.active === "true" : undefined,
                search: req.query.search as string,
                sortBy: req.query.sortBy as any,
                sortOrder: req.query.sortOrder as any,
            };

            // Get restaurantId from authenticated admin if scoped
            const restaurantId = (req as any).user?.restaurantId;

            const result = await customerService.getCustomers(query, restaurantId);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    message: result.error,
                });
                return;
            }

            res.status(200).json({
                success: true,
                ...result.data,
            });
        } catch (error) {
            console.error("Get customers error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }

    /**
     * Get single customer by ID (Admin)
     * GET /api/v1/customer/:id
     * Admin required
     */
    async getCustomerById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await customerService.getCustomerById(id);

            if (!result.success) {
                res.status(404).json({
                    success: false,
                    message: result.error,
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: result.data,
            });
        } catch (error) {
            console.error("Get customer by id error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }

    /**
     * Update customer by ID (Admin)
     * PUT /api/v1/customer/:id
     * Admin required
     */
    async updateCustomer(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const data: UpdateCustomerInput = req.body;

            const result = await customerService.updateCustomer(id, data);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    message: result.error,
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: "Customer updated successfully",
                data: result.data,
            });
        } catch (error) {
            console.error("Update customer error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }

    /**
     * Delete customer (Admin)
     * DELETE /api/v1/customer/:id
     * Admin required
     */
    async deleteCustomer(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await customerService.deleteCustomer(id);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    message: result.error,
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: "Customer deleted successfully",
            });
        } catch (error) {
            console.error("Delete customer error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
}

export default new CustomerController();
