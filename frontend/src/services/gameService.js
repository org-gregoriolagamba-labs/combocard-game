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
export const createGame = async ({ requiredCredits, isPrivate, maxPlayers, soundsEnabled, estrazione }) => {
  const response = await api.post("/games", {
    requiredCredits,
    isPrivate,
    maxPlayers,
    soundsEnabled,
    estrazione,
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
 * @returns {Promise} Join result
 */
export const joinGame = async (gameId) => {
  const response = await api.post(`/games/${gameId}/join`);
  return response.data;
};

/**
 * Start a game
 * @param {string} gameId - Game ID
 * @returns {Promise} Start result
 */
export const startGame = async (gameId) => {
  const response = await api.post(`/games/${gameId}/start`);
  return response.data;
};

/**
 * Draw a card
 * @param {string} gameId - Game ID
 * @returns {Promise} Drawn card
 */
export const drawCard = async (gameId) => {
  const response = await api.post(`/games/${gameId}/draw`);
  return response.data;
};

/**
 * Use the jolly on a card of the grid
 * @param {string} gameId - Game ID
 * @param {Object} choice - Position of the card and collection to complete
 * @returns {Promise} Result, with the card the jolly became
 */
export const useJolly = async (gameId, { row, col, tipo }) => {
  const response = await api.post(`/games/${gameId}/jolly`, {
    row,
    col,
    tipo,
  });
  return response.data;
};

/**
 * Declare the jolly for a collection: the draws are paused while the player chooses the card
 * @param {string} gameId - Game ID
 * @param {string} tipo - Collection the jolly is meant for
 * @returns {Promise} The pause that has started, with the time it runs out
 */
export const startJollyChoice = async (gameId, tipo) => {
  const response = await api.post(`/games/${gameId}/jolly/start`, { tipo });
  return response.data;
};

/**
 * Give the jolly choice up: the draws can go on
 * @param {string} gameId - Game ID
 * @returns {Promise} Result
 */
export const cancelJollyChoice = async (gameId) => {
  const response = await api.post(`/games/${gameId}/jolly/cancel`);
  return response.data;
};

/**
 * Leave a game
 * @param {string} gameId - Game ID
 * @returns {Promise} Leave result
 */
export const leaveGame = async (gameId) => {
  const response = await api.post(`/games/${gameId}/leave`);
  return response.data;
};
