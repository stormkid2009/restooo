// src/routes/authRoutes.ts
import { Router } from "express";
import { validate } from "../middleware/validationMiddleware";
import { registerSchema, loginSchema } from "../validators/authValidator";
import authController from "../controllers/authController";

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user account
 * @access  Public
 * @body    { email, password, name, role? }
 * @returns { status: "success", data: { user, token } }
 */
router.post("/register", validate(registerSchema), authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with existing user credentials
 * @access  Public
 * @body    { email, password }
 * @returns { status: "success", data: { user, token } }
 */
router.post("/login", validate(loginSchema), authController.login);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user information
 * @access  Private (requires JWT token)
 * @headers Authorization: Bearer <token>
 * @returns { status: "success", data: { user } }
 *
 * @todo Uncomment when auth middleware is implemented
 * @todo Add authMiddleware before controller
 * @todo Implement authController.me method
 */
// router.get(
//   '/me',
//   authMiddleware,  // TODO: Import and implement
//   authController.me
// );

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout current user (invalidate token)
 * @access  Private (requires JWT token)
 * @headers Authorization: Bearer <token>
 * @returns { status: "success", message: "Logged out successfully" }
 *
 * @todo Uncomment when auth middleware is implemented
 * @todo Add authMiddleware before controller
 * @todo Implement authController.logout method
 * @note With JWT, logout is mainly client-side (remove token)
 *       Server-side implementation is optional (token blacklist)
 */
// router.post(
//   '/logout',
//   authMiddleware,  // TODO: Import and implement
//   authController.logout
// );

export default router;

/**
 * Usage in app.ts:
 *
 * import authRoutes from './routes/authRoutes';
 * app.use('/api/v1/auth', authRoutes);
 *
 * This creates the following endpoints:
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/login
 * - GET  /api/v1/auth/me       (TODO)
 * - POST /api/v1/auth/logout   (TODO)
 */
