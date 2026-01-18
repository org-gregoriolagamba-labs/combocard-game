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
    
    req[property] = value;
    next();
  };
};
