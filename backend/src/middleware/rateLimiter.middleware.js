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
  max: config.rateLimitMaxRequests,
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
  max: 10,
  message: {
    status: "error",
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
