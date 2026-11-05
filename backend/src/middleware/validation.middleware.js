/**
 * Validation Middleware
 * 
 * Validates request data using Joi schemas.
 */

import { AppError } from "../utils/AppError.js";

/**
 * Create a validation middleware from a Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate (body, query, params)
 * @returns {Function} Express middleware
 */
export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      return next(new AppError(errorMessage, 400));
    }
    
    // In Express 5 req.query is a getter on the prototype: it cannot be assigned, only shadowed
    if (property === "query") {
      Object.defineProperty(req, "query", { value, writable: true, configurable: true, enumerable: true });
    } else {
      req[property] = value;
    }
    next();
  };
};
