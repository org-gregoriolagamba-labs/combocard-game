/**
 * Error Handler Middleware
 * 
 * Centralized error handling for the application.
 * Provides consistent error response format.
 */

import config from "../config/index.js";
import { AppError } from "../utils/AppError.js";

/**
 * Handle 404 Not Found errors
 */
export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

/**
 * Send error response in development environment
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Send error response in production environment
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or unknown error: don't leak error details
    console.error("ERROR 💥:", err);
    
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  
  if (config.nodeEnv === "development") {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    sendErrorProd(error, res);
  }
};
