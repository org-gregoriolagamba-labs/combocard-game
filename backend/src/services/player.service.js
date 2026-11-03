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
    // When the player confirmed that they read the rules; null until then
    regoleAccettateIl: null,
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

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppError("Invalid amount", 400);
  }

  if (amount > config.maxCreditsPerPurchase) {
    throw new AppError(`Maximum purchasable amount is ${config.maxCreditsPerPurchase} credits`, 400);
  }

  player.credits += amount;
  return player;
}

/**
 * Mark that the player read and understood the rules. Only the first confirmation counts.
 * @param {Object} gameState - Global game state
 * @param {string} playerId - Player ID
 * @returns {Object} Updated player
 */
export function acceptRules(gameState, playerId) {
  const player = getPlayer(gameState, playerId);
  if (!player.regoleAccettateIl) {
    player.regoleAccettateIl = new Date().toISOString();
  }
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
