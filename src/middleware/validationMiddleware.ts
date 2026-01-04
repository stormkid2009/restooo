// src/middleware/validationMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Error detail interface for consistent error formatting
 */
interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation Middleware
 *
 * Generic middleware that validates req.body against any Zod schema
 * Returns detailed error information if validation fails
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 *
 * @example
 * router.post('/register', validate(registerSchema), authController.register);
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate req.body against the schema
      schema.parse(req.body);

      // If validation succeeds, continue to next middleware
      next();
    } catch (error) {
      // Handle validation errors
      if (error instanceof ZodError) {
        // Format errors into detailed array
        const errors: ValidationErrorDetail[] = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        // Return 400 Bad Request with detailed errors
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors,
        });
      }

      // Handle unexpected errors
      return res.status(500).json({
        status: "error",
        message: "Internal server error during validation",
      });
    }
  };
};

/**
 * Query Validation Middleware
 *
 * Generic middleware that validates req.query against any Zod schema
 * Handles type coercion for query parameters (strings to numbers/booleans)
 *
 * Stores validated query in req.validatedQuery for use in controllers
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 *
 * @example
 * router.get('/menu', validateQuery(listMenuSchema), menuController.list);
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate req.query
      // Zod will transform strings to appropriate types
      const validated = schema.parse(req.query);

      // Store validated data in a new property
      // Can't reassign req.query as it's read-only
      (req as any).validatedQuery = validated;

      // Continue to next middleware
      next();
    } catch (error) {
      // Log the actual error for debugging
      console.error("Query validation error:", error);

      // Handle validation errors
      if (error instanceof ZodError) {
        // Format errors into detailed array
        const errors: ValidationErrorDetail[] = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        // Return 400 Bad Request with detailed errors
        return res.status(400).json({
          status: "error",
          message: "Query validation failed",
          errors,
        });
      }

      // Handle unexpected errors
      return res.status(500).json({
        status: "error",
        message: "Internal server error during query validation",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

/**
 * Example Error Response:
 *
 * {
 *   "status": "error",
 *   "message": "Validation failed",
 *   "errors": [
 *     {
 *       "field": "email",
 *       "message": "Invalid email format",
 *       "code": "invalid_string"
 *     },
 *     {
 *       "field": "password",
 *       "message": "Password must be at least 6 characters long",
 *       "code": "too_small"
 *     }
 *   ]
 * }
 */
