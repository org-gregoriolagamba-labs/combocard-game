/**
 * Custom Application Error Class
 * 
 * Extends the native Error class to include HTTP status codes
 * and distinguish between operational and programming errors.
 */

export class AppError extends Error {
  /**
   * Create an AppError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Operational errors are expected errors
    
    // Capture stack trace, excluding constructor call from stack
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Helper function to create common errors
 */
export const createError = {
  badRequest: (message = "Bad Request") => new AppError(message, 400),
  unauthorized: (message = "Unauthorized") => new AppError(message, 401),
  forbidden: (message = "Forbidden") => new AppError(message, 403),
  notFound: (message = "Not Found") => new AppError(message, 404),
  conflict: (message = "Conflict") => new AppError(message, 409),
  tooManyRequests: (message = "Too Many Requests") => new AppError(message, 429),
  internal: (message = "Internal Server Error") => new AppError(message, 500),
};
