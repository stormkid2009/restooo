export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

/**
 * Constructor for AppError
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code associated with the error
 */
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Indicates it's a known error, not a bug
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
/**
 * Constructor for NotFoundError
 * @param {string} message - Error message (default: "Resource not found")
 */
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
/**
 * Constructor for BadRequestError
 * @param {string} [message="Bad request"] - Error message, defaults to "Bad request"
 */
  constructor(message: string = "Bad request") {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
/**
 * Constructor for ConflictError
 * @param {string} [message="Conflict"] - Error message, defaults to "Conflict"
 * */
  constructor(message: string = "Conflict") {
    super(message, 409);
  }
}
