// src/middleware/validationMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { ZodTypeAny, ZodError, ZodIssue } from "zod";

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
export const validate = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate req.body against the schema
      schema.parse(req.body);

      // If validation succeeds, continue to next middleware
      next();
    } catch (error: unknown) {
      // Handle validation errors
      if (error instanceof ZodError) {
        // Format errors into detailed array
        const errors: ValidationErrorDetail[] = error.issues.map(
          (issue: ZodIssue) => ({
            field: issue.path.map(String).join("."), // safer
            message: issue.message,
            code: issue.code,
          }),
        );

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
