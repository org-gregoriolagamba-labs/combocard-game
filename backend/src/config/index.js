/**
 * Application Configuration
 * 
 * Centralizes all environment variables and configuration settings.
 * Uses dotenv to load environment variables from .env file.
 */

import { randomBytes } from "crypto";
import dotenv from "dotenv";
import { RATE_LIMIT_DEFAULTS } from "./constants.js";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const corsOriginRaw = process.env.CORS_ORIGIN;
const isProduction = process.env.NODE_ENV === "production";
const MIN_JWT_SECRET_LENGTH = 32;

const config = {
  // Server configuration
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3001,
  
  // CORS configuration
  corsOrigin: corsOriginRaw || (process.env.NODE_ENV === "production" ? "http://localhost:3000" : "*"),
  corsOriginRaw,
  
  // Database (optional: without a URL, data stays in memory)
  databaseUrl: process.env.DATABASE_URL || null,
  databasePoolMax: parseInt(process.env.DATABASE_POOL_MAX, 10) || 10,

  // Authentication
  // Outside production a missing secret gets a random value: access tokens stop
  // working at each restart, and the client silently renews them with the cookie
  jwtSecret: process.env.JWT_SECRET || (isProduction ? null : randomBytes(48).toString("hex")),
  accessTokenTtlSeconds: parseInt(process.env.ACCESS_TOKEN_TTL_SECONDS, 10) || 15 * 60,
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS, 10) || 7,
  refreshReuseGraceSeconds: parseInt(process.env.REFRESH_REUSE_GRACE_SECONDS, 10) || 10,
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : isProduction,
  cookieSameSite: process.env.COOKIE_SAMESITE || "strict",

  // Number of reverse proxies in front of the server, used to find the client IP
  trustProxy: parseInt(process.env.TRUST_PROXY, 10) || 0,

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || RATE_LIMIT_DEFAULTS.WINDOW_MS,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || RATE_LIMIT_DEFAULTS.MAX_REQUESTS,
  rateLimitDisabled: process.env.RATE_LIMIT_DISABLED === "true",
  
  // Game configuration
  defaultCredits: parseInt(process.env.DEFAULT_CREDITS, 10) || 0,
  maxCreditsPerPurchase: parseInt(process.env.MAX_CREDITS_PER_PURCHASE, 10) || 10000,
  drawCooldownSeconds: parseInt(process.env.DRAW_COOLDOWN_SECONDS, 10) || 8,
  // Time the player on turn has to draw (drawing by turns), before the card is drawn by itself and the player is warned
  drawTurnSeconds: parseInt(process.env.DRAW_TURN_SECONDS, 10) || 60,
  
  // Prize distribution percentages
  prizeDistribution: {
    tris: parseFloat(process.env.PRIZE_TRIS) || 0.10,
    sequenza: parseFloat(process.env.PRIZE_SEQUENZA) || 0.15,
    scopa: parseFloat(process.env.PRIZE_SCOPA) || 0.20,
    napola: parseFloat(process.env.PRIZE_NAPOLA) || 0.25,
    combocard_reale: parseFloat(process.env.PRIZE_COMBOCARD_REALE) || 0.30,
  },
};

// Validate required configuration in production
if (config.nodeEnv === "production") {
  if (!process.env.CORS_ORIGIN) {
    console.warn("⚠️ CORS_ORIGIN not set in production environment");
  }
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️ DATABASE_URL not set in production environment");
  }
}

/**
 * Check the authentication settings. In production the server must not start with
 * a weak or missing secret, because anyone could then forge valid access tokens.
 * @throws {Error} If the configuration is not safe
 */
export function assertAuthConfig() {
  if (!isProduction) {
    return;
  }
  if (!config.jwtSecret || config.jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be set to at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }
}

export default config;
