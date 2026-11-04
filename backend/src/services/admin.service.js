/**
 * Admin Service
 *
 * Changing the role of an account from its username: what the command line script
 * (npm run admin:promote) does. The same service will serve the admin routes.
 */

import { AppError } from "../utils/AppError.js";
import { normalizeUsername } from "./auth.service.js";
import { INVALID_ROLE, LAST_ADMIN } from "../db/store.js";

/**
 * Give an account a role
 * @param {Object} store - Persistence store
 * @param {Object} change - { username, role, actor }: actor is { type: 'system' } or { type: 'player', id }
 * @returns {Promise<Object>} { playerId, role, previousRole, changed }
 * @throws {AppError} 404 if the user does not exist, 409 for the last admin, 400 for a role that does not exist
 */
export async function changeRoleByUsername(store, { username, role, actor }) {
  const account = await store.findAccountByUsernameKey(normalizeUsername(username));
  if (!account) {
    throw new AppError("User not found", 404);
  }

  try {
    return await store.setAccountRole(account.playerId, role, { actor });
  } catch (err) {
    if (err.code === LAST_ADMIN) {
      throw new AppError("Cannot remove the last admin", 409);
    }
    if (err.code === INVALID_ROLE) {
      throw new AppError("Invalid role", 400);
    }
    throw err;
  }
}
