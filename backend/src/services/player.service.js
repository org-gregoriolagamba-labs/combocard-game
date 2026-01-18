/**
 * Player Service
 * 
 * Handles player-related business logic.
 */

import { generateId } from "../utils/card.utils.js";
import { AppError } from "../utils/AppError.js";
import config from "../config/index.js";

/**
 * Register a new player
 * @param {Object} gameState - Global game state
 * @param {string} playerName - Player name
 * @returns {Object} Created player
 */
export function registerPlayer(gameState, playerName) {
  if (!playerName || playerName.trim().length === 0) {
    throw new AppError("Player name is required", 400);
  }

  const playerId = generateId();

  gameState.players[playerId] = {
    id: playerId,
    name: playerName.trim(),
    credits: config.defaultCredits,
    currentGameId: null,
    createdAt: new Date().toISOString(),
  };

  return gameState.players[playerId];
}

/**
 * Get player by ID
 * @param {Object} gameState - Global game state
 * @param {string} playerId - Player ID
 * @returns {Object} Player object
 */
export function getPlayer(gameState, playerId) {
  const player = gameState.players[playerId];
  if (!player) {
    throw new AppError("Player not found", 404);
  }
  return player;
}

/**
 * Buy credits for a player
 * @param {Object} gameState - Global game state
 * @param {string} playerId - Player ID
 * @param {number} amount - Amount to add
 * @returns {Object} Updated player
 */
export function buyCredits(gameState, playerId, amount) {
  const player = getPlayer(gameState, playerId);

  if (!amount || amount <= 0) {
    throw new AppError("Invalid amount", 400);
  }

  if (amount > config.maxCreditsPerPurchase) {
    throw new AppError(`Maximum purchasable amount is ${config.maxCreditsPerPurchase} credits`, 400);
  }

  player.credits += amount;
  return player;
}

/**
 * Get all players
 * @param {Object} gameState - Global game state
 * @returns {Array} Array of players
 */
export function getAllPlayers(gameState) {
  return Object.values(gameState.players);
}
