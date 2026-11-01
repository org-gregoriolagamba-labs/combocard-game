/**
 * Rate Limiter Middleware
 * 
 * Implements rate limiting to prevent abuse.
 */

import rateLimit from "express-rate-limit";
import config from "../config/index.js";

/**
 * Create a rate limiter middleware
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMaxRequests,
  skip: () => config.nodeEnv === "test" || config.rateLimitDisabled,
  message: {
    status: "error",
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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
