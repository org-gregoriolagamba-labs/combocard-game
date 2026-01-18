/**
 * Game Service
 * 
 * API calls related to game management.
 */

import api from "./api";

/**
 * Get lobby list
 * @returns {Promise} Array of waiting games
 */
export const getLobby = async () => {
  const response = await api.get("/games/lobby");
  return response.data;
};

/**
 * Create a new game
 * @param {Object} options - Game options
 * @returns {Promise} Game data
 */
export const createGame = async ({ playerId, requiredCredits, isPrivate, maxPlayers }) => {
  const response = await api.post("/games", {
    playerId,
    requiredCredits,
    isPrivate,
    maxPlayers,
  });
  return response.data;
};

/**
 * Get game by ID
 * @param {string} gameId - Game ID
 * @returns {Promise} Game data
 */
export const getGame = async (gameId) => {
  const response = await api.get(`/games/${gameId}`);
  return response.data;
};

/**
 * Join a game
 * @param {string} gameId - Game ID
 * @param {string} playerId - Player ID
 * @returns {Promise} Join result
 */
export const joinGame = async (gameId, playerId) => {
  const response = await api.post(`/games/${gameId}/join`, { playerId });
  return response.data;
};

/**
 * Start a game
 * @param {string} gameId - Game ID
 * @param {string} playerId - Player ID
 * @returns {Promise} Start result
 */
export const startGame = async (gameId, playerId) => {
  const response = await api.post(`/games/${gameId}/start`, { playerId });
  return response.data;
};

/**
 * Draw a card
 * @param {string} gameId - Game ID
 * @param {string} playerId - Player ID
 * @returns {Promise} Drawn card
 */
export const drawCard = async (gameId, playerId) => {
  const response = await api.post(`/games/${gameId}/draw`, { playerId });
  return response.data;
};

/**
 * Claim a collection
 * @param {string} gameId - Game ID
 * @param {string} playerId - Player ID
 * @param {string} tipo - Collection type
 * @returns {Promise} Claim result
 */
export const claimCollection = async (gameId, playerId, tipo) => {
  const response = await api.post(`/games/${gameId}/claim`, { playerId, tipo });
  return response.data;
};

/**
 * Use jolly card
 * @param {string} gameId - Game ID
 * @param {Object} options - Jolly options
 * @returns {Promise} Jolly result
 */
export const useJolly = async (gameId, { playerId, row, col, tipo }) => {
  const response = await api.post(`/games/${gameId}/jolly`, {
    playerId,
    row,
    col,
    tipo,
  });
  return response.data;
};

/**
 * Leave a game
 * @param {string} gameId - Game ID
 * @param {string} playerId - Player ID
 * @returns {Promise} Leave result
 */
export const leaveGame = async (gameId, playerId) => {
  const response = await api.post(`/games/${gameId}/leave`, { playerId });
  return response.data;
};
