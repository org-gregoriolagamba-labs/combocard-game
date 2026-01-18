/**
 * Health Controller
 * 
 * Handles health check endpoints.
 */

import { sendSuccess } from "../utils/response.utils.js";

/**
 * Health check endpoint
 * GET /api/health
 */
export const healthCheck = (req, res) => {
  sendSuccess(res, {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};

/**
 * Detailed health check
 * GET /api/health/detailed
 */
export const detailedHealthCheck = (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  sendSuccess(res, {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
    },
    gameState: {
      activeGames: Object.keys(req.gameState?.games || {}).length,
      registeredPlayers: Object.keys(req.gameState?.players || {}).length,
    },
  });
};
