/**
 * Player Controller
 * 
 * Handles HTTP requests related to players.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.utils.js";
import { AppError } from "../utils/AppError.js";
import * as playerService from "../services/player.service.js";

const STORAGE_UNAVAILABLE = "Storage temporarily unavailable, please try again";

/**
 * Get player by ID
 * GET /api/players/:playerId
 */
export const getPlayer = asyncHandler(async (req, res) => {
  const player = playerService.getPlayer(req.gameState, req.params.playerId);
  sendSuccess(res, player);
});

/**
 * Buy credits for a player
 * POST /api/players/:playerId/buy-credits
 */
export const buyCredits = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const player = playerService.buyCredits(req.gameState, req.params.playerId, amount);

  try {
    await req.store.recordPurchase(player.id, amount);
  } catch (err) {
    console.error(`❌ Could not save purchase for player ${player.id}: ${err.message}`);
    player.credits -= amount;
    throw new AppError(STORAGE_UNAVAILABLE, 503);
  }

  sendSuccess(res, {
    success: true,
    credits: player.credits,
  }, "Credits purchased successfully");
});
