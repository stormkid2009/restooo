// src/types/express/index.d.ts

/**
 * Extend Express Request interface to include user property
 * This allows TypeScript to recognize req.user after authentication
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * User information extracted from JWT token
       * Available after authMiddleware runs successfully
       */
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

// This export is required for the declaration to work
export {};
