/**
 * Admin Service
 *
 * API calls of the admin area: the users, their name, role and credits, the games, the statistics
 * and the audit log.
 * Every one of them is refused by the server (403) to whoever is not an admin.
 */

import api from "./api";

// A query string with only what has a value
const query = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};

/**
 * One page of the registered users
 * @param {Object} filters - { q, role, page, limit }
 * @returns {Promise<Object>} { items, total, page, limit }
 */
export const listUsers = async ({ q, role, page, limit } = {}) => {
  const response = await api.get(`/admin/users${query({ q, role, page, limit })}`);
  return response.data;
};

/**
 * One user
 * @param {string} playerId - Player ID
 * @returns {Promise<Object>} { playerId, username, role, credits, createdAt, inGame }
 */
export const getUser = async (playerId) => {
  const response = await api.get(`/admin/users/${encodeURIComponent(playerId)}`);
  return response.data;
};

/**
 * Rename a user, or change their role (one of the two at a time)
 * @param {string} playerId - Player ID
 * @param {Object} change - { username } or { role }
 * @returns {Promise<Object>} The user as it is now
 */
export const updateUser = async (playerId, change) => {
  const response = await api.patch(`/admin/users/${encodeURIComponent(playerId)}`, change);
  return response.data;
};

/**
 * Add or take away credits, with the reason
 * @param {string} playerId - Player ID
 * @param {Object} adjustment - { amount (negative to take away), reason }
 * @returns {Promise<Object>} { playerId, credits }
 */
export const adjustCredits = async (playerId, { amount, reason }) => {
  const response = await api.post(`/admin/users/${encodeURIComponent(playerId)}/credits`, { amount, reason });
  return response.data;
};

/**
 * Suspend a user: they lose the access at once and their sessions are closed
 * @param {string} playerId - Player ID
 * @param {Object} action - { reason }
 * @returns {Promise<Object>} The user as it is now
 */
export const suspendUser = async (playerId, { reason }) => {
  const response = await api.post(`/admin/users/${encodeURIComponent(playerId)}/suspend`, { reason });
  return response.data;
};

/**
 * Reinstate a suspended user
 * @param {string} playerId - Player ID
 * @param {Object} action - { reason }
 * @returns {Promise<Object>} The user as it is now
 */
export const unsuspendUser = async (playerId, { reason }) => {
  const response = await api.post(`/admin/users/${encodeURIComponent(playerId)}/unsuspend`, { reason });
  return response.data;
};

/**
 * Close every session of a user, without suspending them
 * @param {string} playerId - Player ID
 * @param {Object} action - { reason }
 * @returns {Promise<Object>} The user as it is now
 */
export const revokeSessions = async (playerId, { reason }) => {
  const response = await api.post(`/admin/users/${encodeURIComponent(playerId)}/sessions/revoke`, { reason });
  return response.data;
};

/**
 * One page of the audit log, the latest first
 * @param {Object} filters - { targetId, page, limit }
 * @returns {Promise<Object>} { items, total, page, limit }
 */
export const listAudit = async ({ targetId, page, limit } = {}) => {
  const response = await api.get(`/admin/audit${query({ targetId, page, limit })}`);
  return response.data;
};

/**
 * One page of the games waiting or in progress, the oldest first: metadata only
 * @param {Object} filters - { status ('waiting' or 'playing'), page, limit }
 * @returns {Promise<Object>} { items, total, page, limit }
 */
export const listGames = async ({ status, page, limit } = {}) => {
  const response = await api.get(`/admin/games${query({ status, page, limit })}`);
  return response.data;
};

/**
 * Cancel a game that is stuck: the players still in it get the entry fee back
 * @param {string} gameId - Game ID
 * @param {Object} cancellation - { reason }
 * @returns {Promise<Object>} { gameId, previousStatus, players: [{ playerId, credits, refund }] }
 */
export const cancelGame = async (gameId, { reason }) => {
  const response = await api.post(`/admin/games/${encodeURIComponent(gameId)}/cancel`, { reason });
  return response.data;
};

/**
 * The numbers of the platform
 * @returns {Promise<Object>} { users, games, credits, prizesDistributed }
 */
export const getStats = async () => {
  const response = await api.get("/admin/stats");
  return response.data;
};
