/**
 * Admin Service
 *
 * Changing the role of an account from its username: what the command line script
 * (npm run admin:promote) does. The same service will serve the admin routes.
 */

import { AppError } from "../utils/AppError.js";
import { normalizeUsername } from "./auth.service.js";
import { activeGameOf } from "./game.service.js";
import { INSUFFICIENT_CREDITS, INVALID_ROLE, LAST_ADMIN, USERNAME_TAKEN } from "../db/store.js";

const STORAGE_UNAVAILABLE = "Storage temporarily unavailable, please try again";

// A user as the admin sees them: the account from the store, the credits from the game
const userView = (account, gameState) => ({
  playerId: account.playerId,
  username: account.username,
  role: account.role,
  credits: gameState.players[account.playerId]?.credits ?? 0,
  createdAt: account.createdAt,
  inGame: activeGameOf(gameState, account.playerId) !== null,
});

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

/**
 * One page of the registered users
 * @param {Object} store - Persistence store
 * @param {Object} gameState - Global game state
 * @param {Object} query - { q, role, page, limit }
 * @returns {Promise<Object>} { items, total, page, limit }
 */
export async function listUsers(store, gameState, { q = "", role, page = 1, limit = 20 } = {}) {
  const { items, total } = await store.listAccounts({
    q: normalizeUsername(q),
    role,
    limit,
    offset: (page - 1) * limit,
  });
  return { items: items.map((account) => userView(account, gameState)), total, page, limit };
}

/**
 * One user
 * @throws {AppError} 404 if the user does not exist
 */
export async function getUser(store, gameState, playerId) {
  const account = await store.getAccount(playerId);
  if (!account) {
    throw new AppError("User not found", 404);
  }
  return userView(account, gameState);
}

/**
 * Rename a user, or change their role (one of the two at a time)
 * @param {Object} change - { username } or { role }
 * @param {Object} actor - { type: 'player', id } of the admin
 * @returns {Promise<Object>} The user as it is now
 * @throws {AppError} 404 if the user does not exist, 409 for a name in use, a player in a game or the last admin
 */
export async function updateUser(store, gameState, playerId, { username, role }, actor) {
  await getUser(store, gameState, playerId);

  if (username !== undefined) {
    // The name is copied in the data of the game: it cannot change while the player is in one
    if (activeGameOf(gameState, playerId)) {
      throw new AppError("Cannot rename a player who is in a game", 409);
    }
    try {
      await store.setAccountUsername(playerId, { username, usernameKey: normalizeUsername(username) }, { actor });
    } catch (err) {
      if (err.code === USERNAME_TAKEN) {
        throw new AppError("Username already taken", 409);
      }
      throw err;
    }
    if (gameState.players[playerId]) {
      gameState.players[playerId].name = username;
    }
  }

  if (role !== undefined) {
    try {
      await store.setAccountRole(playerId, role, { actor });
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

  return getUser(store, gameState, playerId);
}

/**
 * Add or take away credits, with a reason. The credits of the game state change first, then the
 * store writes the movement and the audit row; if it cannot, the credits go back.
 * @param {Object} adjustment - { amount, reason }
 * @param {Object} actor - { type: 'player', id } of the admin
 * @returns {Promise<Object>} { playerId, credits }
 * @throws {AppError} 404 if the user does not exist, 409 if the balance would go below zero, 503 if the store cannot write
 */
export async function adjustUserCredits(store, gameState, playerId, { amount, reason }, actor) {
  const account = await store.getAccount(playerId);
  const player = gameState.players[playerId];
  if (!account || !player) {
    throw new AppError("User not found", 404);
  }
  if (player.credits + amount < 0) {
    throw new AppError("Insufficient credits", 409);
  }

  player.credits += amount;
  try {
    await store.adjustCredits(playerId, amount, { actor, reason });
  } catch (err) {
    player.credits -= amount;
    if (err.code === INSUFFICIENT_CREDITS) {
      throw new AppError("Insufficient credits", 409);
    }
    console.error(`❌ Could not save the credit adjustment of player ${playerId}: ${err.message}`);
    throw new AppError(STORAGE_UNAVAILABLE, 503);
  }

  return { playerId, credits: player.credits };
}

/**
 * One page of the audit log, the latest first
 * @param {Object} query - { targetId, page, limit }
 * @returns {Promise<Object>} { items, total, page, limit }
 */
export async function listAudit(store, { targetId, page = 1, limit = 20 } = {}) {
  const [items, total] = await Promise.all([
    store.listAuditEvents({ limit, offset: (page - 1) * limit, targetId }),
    store.countAuditEvents({ targetId }),
  ]);
  return { items, total, page, limit };
}
