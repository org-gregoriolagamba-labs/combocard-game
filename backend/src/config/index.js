/**
 * Application Configuration
 * 
 * Centralizes all environment variables and configuration settings.
 * Uses dotenv to load environment variables from .env file.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const config = {
  // Server configuration
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3001,
  
  // CORS configuration
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  
  // Game configuration
  defaultCredits: parseInt(process.env.DEFAULT_CREDITS, 10) || 0,
  maxCreditsPerPurchase: parseInt(process.env.MAX_CREDITS_PER_PURCHASE, 10) || 10000,
  drawCooldownSeconds: parseInt(process.env.DRAW_COOLDOWN_SECONDS, 10) || 8,
  
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
}

export default config;
