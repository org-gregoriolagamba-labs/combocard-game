/**
 * Auth Service
 *
 * API calls for accounts and sessions.
 */

import api, { refreshSession, setAccessToken } from "./api";

const startSession = (session) => {
  setAccessToken(session.accessToken);
  return session;
};

/**
 * Create an account
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} { accessToken, player }
 */
export const register = async (username, password) => {
  const response = await api.post("/auth/register", { username, password });
  return startSession(response.data);
};

/**
 * Log in
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} { accessToken, player }
 */
export const login = async (username, password) => {
  const response = await api.post("/auth/login", { username, password });
  return startSession(response.data);
};

/**
 * Bring back the session after a page load, if the refresh cookie is still valid
 * @returns {Promise<Object|null>} Player, or null without a session
 */
export const restoreSession = async () => {
  const session = await refreshSession();
  return session?.player ?? null;
};

/**
 * Log out from this device. The token is forgotten even if the server cannot be reached.
 */
export const logout = async () => {
  setAccessToken(null);
  await api.post("/auth/logout");
};
