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
 * @returns {Promise<Object>} { accessToken, player, role }
 */
export const register = async (username, password) => {
  const response = await api.post("/auth/register", { username, password });
  return startSession(response.data);
};

/**
 * Log in
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} { accessToken, player, role }
 */
export const login = async (username, password) => {
  const response = await api.post("/auth/login", { username, password });
  return startSession(response.data);
};

/**
 * Bring back the session after a page load, if the refresh cookie is still valid
 * @returns {Promise<Object|null>} Player with their role in it (a player, unless the server says
 *   otherwise), or null without a session
 */
export const restoreSession = async () => {
  const session = await refreshSession();
  return session?.player
    ? { ...session.player, role: session.role ?? "player", mustChangePassword: session.mustChangePassword === true }
    : null;
};

/**
 * Choose a new password, with the current one (the temporary one, after a reset by an admin). The other
 * sessions close, and the server opens a new one for this device.
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} { accessToken, player, role, mustChangePassword }
 */
export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.post("/auth/password", { currentPassword, newPassword });
  return startSession(response.data);
};

/**
 * Log out from this device. The token is forgotten even if the server cannot be reached.
 */
export const logout = async () => {
  setAccessToken(null);
  await api.post("/auth/logout");
};
