/**
 * Player Service
 * 
 * API calls related to player management.
 */

import api from "./api";

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
