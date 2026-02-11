
// src/modules/customer/customer.routes.ts
import { Router } from "express";
import customerController from "./customer.controller";
import { authenticate, authorize, authenticateCustomer } from "../../middleware/authenticate";
import { validateRequest } from "../../middleware/validateRequest";
import {
    createCustomerSchema,
    updateCustomerSchema,
    customerQuerySchema,
    customerIdSchema,
} from "./customer.schema";

const router = Router();

// Public Routes
router.post(
    "/",
    validateRequest(createCustomerSchema),
    customerController.register
);

// Customer Routes (Authenticated)
router.get(
    "/me",
    authenticateCustomer,
    customerController.getMe
);

router.put(
    "/me",
    authenticateCustomer,
    validateRequest(updateCustomerSchema),
    customerController.updateMe
);

// Admin Routes
router.get(
    "/",
    authenticate,
    authorize(["ADMIN", "MANAGER"]),
    validateRequest(customerQuerySchema, "query"),
    customerController.getCustomers
);

router.get(
    "/:id",
    authenticate,
    authorize(["ADMIN", "MANAGER"]),
    validateRequest(customerIdSchema, "params"),
    customerController.getCustomerById
);

router.put(
    "/:id",
    authenticate,
    authorize(["ADMIN", "MANAGER"]),
    validateRequest(customerIdSchema, "params"),
    validateRequest(updateCustomerSchema, "body"),
    customerController.updateCustomer
);

router.delete(
    "/:id",
    authenticate,
    authorize(["ADMIN"]),
    validateRequest(customerIdSchema, "params"),
    customerController.deleteCustomer
);

export default router;
