// src/routes/index.ts
import { Router } from "express";
import authRoutes from "./authRoutes";
import menuRoutes from "./menuRoutes";

// Future route imports
// import orderRoutes from './orderRoutes';
// import reservationRoutes from './reservationRoutes';
// import customerRoutes from './customerRoutes';
// import tableRoutes from './tableRoutes';
// import staffRoutes from './staffRoutes';
// import analyticsRoutes from './analyticsRoutes';

const router = Router();

/**
 * Authentication Routes
 * @prefix /api/v1/auth
 * @routes
 *   - POST /register - Register new user
 *   - POST /login - Authenticate user
 *   - GET /me - Get current user (TODO)
 *   - POST /logout - Logout user (TODO)
 */
router.use("/auth", authRoutes);

/**
 * Menu Management Routes
 * @prefix /api/v1/menu
 * @routes
 *   - GET / - List all menu items
 *   - GET /:id - Get single menu item
 *   - POST / - Create menu item
 *   - PUT /:id - Update menu item
 *   - DELETE /:id - Delete menu item
 *
 */
router.use("/menu", menuRoutes);

/**
 * Order Management Routes
 * @prefix /api/v1/orders
 * @routes
 *   - GET / - List all orders
 *   - GET /:id - Get single order
 *   - POST / - Create new order
 *   - PATCH /:id/status - Update order status
 *   - DELETE /:id - Cancel order
 * @todo Implement order routes
 */
// router.use('/orders', orderRoutes);

/**
 * Reservation Management Routes
 * @prefix /api/v1/reservations
 * @routes
 *   - GET / - List all reservations
 *   - GET /availability - Check table availability
 *   - GET /:id - Get single reservation
 *   - POST / - Create reservation
 *   - PATCH /:id - Update reservation
 *   - DELETE /:id - Cancel reservation
 * @todo Implement reservation routes
 */
// router.use('/reservations', reservationRoutes);

/**
 * Customer Management Routes
 * @prefix /api/v1/customers
 * @routes
 *   - GET / - List all customers
 *   - GET /:id - Get single customer
 *   - POST / - Create customer
 *   - PUT /:id - Update customer
 *   - DELETE /:id - Delete customer
 *   - GET /:id/orders - Get customer order history
 * @todo Implement customer routes
 */
// router.use('/customers', customerRoutes);

/**
 * Table Management Routes
 * @prefix /api/v1/tables
 * @routes
 *   - GET / - List all tables
 *   - GET /:id - Get single table
 *   - POST / - Create table
 *   - PUT /:id - Update table
 *   - PATCH /:id/status - Update table status
 *   - DELETE /:id - Delete table
 * @todo Implement table routes
 */
// router.use('/tables', tableRoutes);

/**
 * Staff Management Routes
 * @prefix /api/v1/staff
 * @routes
 *   - GET / - List all staff
 *   - GET /:id - Get single staff member
 *   - POST / - Create staff member
 *   - PUT /:id - Update staff member
 *   - DELETE /:id - Delete staff member
 * @todo Implement staff routes
 */
// router.use('/staff', staffRoutes);

/**
 * Analytics & Reports Routes
 * @prefix /api/v1/analytics
 * @routes
 *   - GET /sales - Get sales analytics
 *   - GET /popular-items - Get most popular menu items
 *   - GET /revenue - Get revenue reports
 *   - GET /reservations - Get reservation statistics
 * @todo Implement analytics routes
 */
// router.use('/analytics', analyticsRoutes);

export default router;

/**
 * Usage in app.ts:
 *
 * import routes from './routes';
 * app.use('/api/v1', routes);
 *
 * This creates the following structure:
 * - /api/v1/auth/*
 * - /api/v1/menu/*        (TODO)
 * - /api/v1/orders/*      (TODO)
 * - /api/v1/reservations/* (TODO)
 * - /api/v1/customers/*   (TODO)
 * - /api/v1/tables/*      (TODO)
 * - /api/v1/staff/*       (TODO)
 * - /api/v1/analytics/*   (TODO)
 */
