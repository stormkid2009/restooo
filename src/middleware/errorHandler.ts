import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

/**
 * Error handler middleware
 *
 * Catches all errors and sends appropriate responses.
 *
 * @param {any} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // If it's a known operational error, send its specific status and message
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  // Handle Zod validation errors nicely
  if (err.name === "ZodError" || err.issues) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: err.issues || err.errors
    });
  }

  // Keep generic Error for truly unexpected/internal failures
  console.error("Internal Server Error:", err);
  return res.status(500).json({
    status: "error",
    message: "Internal server error"
  });
};
