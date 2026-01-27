import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError, core } from "zod";

/**
 * Error detail interface
 */
interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation Source
 */
export type ValidationSource = "body" | "query" | "params";

/**
 * Validate Request Middleware
 *
 * Validates request data against Zod schema
 *
 * @param schema - Zod schema
 * @param source - 'body' (default), 'query', or 'params'
 */
export const validateRequest = (
  schema: ZodType,
  source: ValidationSource = "body"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[source];

      const validated = schema.parse(dataToValidate);

      // If validating query/params, we might want to attach validated data
      // because partial parsing or coercion might have happened
      if (source !== "body") {
        (req as any)[`validated${source.charAt(0).toUpperCase() + source.slice(1)}`] = validated;
      } else {
          req.body = validated;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Log error for debugging
        // console.log("Validation error:", error);
        
        // ZodError uses .issues, .errors might be deprecated/missing
        const issues = (error as any).issues || (error as any).errors || [];
        
        const errors: ValidationErrorDetail[] = issues.map((err: core.$ZodIssue) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          status: "error",
          message: `Validation failed for ${source}`,
          errors,
        });
      }

      return res.status(500).json({
        status: "error",
        message: "Internal server error during validation",
      });
    }
  };
};
