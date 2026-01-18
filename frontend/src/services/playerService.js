/**
 * Player Service
 * 
 * API calls related to player management.
 */

import api from "./api";

/**
 * Register a new player
 * @param {string} playerName - Player name
 * @returns {Promise} Player data
 */
export const registerPlayer = async (playerName) => {
  const response = await api.post("/players/register", { playerName });
  return response.data;
};

/**
 * Get player by ID
 * @param {string} playerId - Player ID
 * @returns {Promise} Player data
 */
export const getPlayer = async (playerId) => {
  const response = await api.get(`/players/${playerId}`);
  return response.data;
};

/**
 * Buy credits for a player
 * @param {string} playerId - Player ID
 * @param {number} amount - Amount to buy
 * @returns {Promise} Updated credits
 */
export const buyCredits = async (playerId, amount) => {
  const response = await api.post(`/players/${playerId}/buy-credits`, { amount });
  return response.data;
};

/**
 * Get all players (debug)
 * @returns {Promise} Array of players
 */
export const getAllPlayers = async () => {
  const response = await api.get("/players");
  return response.data;
};
