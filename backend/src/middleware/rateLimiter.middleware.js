/**
 * Rate Limiter Middleware
 * 
 * Implements rate limiting to prevent abuse.
 */

import rateLimit from "express-rate-limit";
import config from "../config/index.js";

/**
 * Create the general limit on the requests of an IP address
 * @param {Object} [options] - Values to use instead of the configured ones
 * @returns {Function} Express middleware
 */
export const createApiLimiter = ({
  windowMs = config.rateLimitWindowMs,
  limit = config.rateLimitMaxRequests,
  skip = () => config.nodeEnv === "test" || config.rateLimitDisabled,
} = {}) => rateLimit({
  windowMs,
  limit,
  skip,
  message: {
    status: "error",
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = createApiLimiter();

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  skip: () => config.nodeEnv === "test" || config.rateLimitDisabled,
  message: {
    status: "error",
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limit on login attempts: only failed ones count, per IP address
 */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  skipSuccessfulRequests: true,
  skip: () => config.nodeEnv === "test" || config.rateLimitDisabled,
  message: {
    status: "error",
    message: "Too many failed login attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
