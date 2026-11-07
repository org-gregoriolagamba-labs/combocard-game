/**
 * Admin Service
 *
 * Changing the role of an account from its username: what the command line script
 * (npm run admin:promote) does. The same service will serve the admin routes.
 */

import { AppError } from "../utils/AppError.js";
import { deleteAccount } from "./account.service.js";
import { generateTemporaryPassword, hashPassword, normalizeUsername } from "./auth.service.js";
import { activeGameOf } from "./game.service.js";
import { GAME_STATUS } from "../config/constants.js";
import { INSUFFICIENT_CREDITS, INVALID_ROLE, LAST_ADMIN, USERNAME_TAKEN } from "../db/store.js";

const STORAGE_UNAVAILABLE = "Storage temporarily unavailable, please try again";

// The name of a player, in the game state and in the game they are in
function setPlayerName(gameState, playerId, name) {
  if (name === undefined) {
    return;
  }
  if (gameState.players[playerId]) {
    gameState.players[playerId].name = name;
  }
  const entry = activeGameOf(gameState, playerId)?.players.find((p) => p.id === playerId);
  if (entry) {
    entry.name = name;
  }
}

// A user as the admin sees them: the account from the store, the credits from the game
const userView = (account, gameState) => ({
  playerId: account.playerId,
  username: account.username,
  role: account.role,
  credits: gameState.players[account.playerId]?.credits ?? 0,
  createdAt: account.createdAt,
  suspended: account.suspended,
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
    // The new name is in the game state before the store writes, so a game joined in the meantime
    // copies it; and once the store has answered, the games the player is in are aligned again
    const previousName = gameState.players[playerId]?.name;
    setPlayerName(gameState, playerId, username);
    try {
      await store.setAccountUsername(playerId, { username, usernameKey: normalizeUsername(username) }, { actor });
    } catch (err) {
      setPlayerName(gameState, playerId, previousName);
      if (err.code === USERNAME_TAKEN) {
        throw new AppError("Username already taken", 409);
      }
      throw err;
    }
    setPlayerName(gameState, playerId, username);
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
 * Add or take away credits, with a reason. The store writes the movement and the audit row; the
 * game state follows it (see below for the order), and if the store cannot write nothing changes.
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
    throw new AppError("The player does not have enough credits", 409);
  }

  // The game state never has credits that the database does not have: credits taken away are
  // reserved at once (a game cannot spend them while the store writes), credits added show only
  // after the store wrote them (a game could spend them, and a failure would leave a debt)
  if (amount < 0) {
    player.credits += amount;
  }
  try {
    await store.adjustCredits(playerId, amount, { actor, reason });
  } catch (err) {
    if (amount < 0) {
      player.credits -= amount;
    }
    if (err.code === INSUFFICIENT_CREDITS) {
      throw new AppError("The player does not have enough credits", 409);
    }
    console.error(`❌ Could not save the credit adjustment of player ${playerId}: ${err.message}`);
    throw new AppError(STORAGE_UNAVAILABLE, 503);
  }

  if (amount > 0) {
    player.credits += amount;
  }
  return { playerId, credits: player.credits };
}

// Suspend, reinstate or close the sessions: the store decides and writes the trace
async function changeAccessOf(store, gameState, playerId, change) {
  await getUser(store, gameState, playerId);
  try {
    await change();
  } catch (err) {
    if (err.code === LAST_ADMIN) {
      throw new AppError("Cannot suspend the last admin", 409);
    }
    console.error(`❌ Could not change the access of player ${playerId}: ${err.message}`);
    throw new AppError(STORAGE_UNAVAILABLE, 503);
  }
  return getUser(store, gameState, playerId);
}

/**
 * Suspend a user: they lose the access at the next request and their sessions are closed. The game
 * they are in is left as it is: the admin can cancel it, or the user can go back to it when reinstated.
 * @param {Object} suspension - { reason }
 * @param {Object} actor - { type: 'player', id } of the admin
 * @returns {Promise<Object>} The user as it is now
 * @throws {AppError} 404 if the user does not exist, 409 for oneself or the last admin, 503 if the store cannot write
 */
export async function suspendUser(store, gameState, playerId, { reason }, actor) {
  if (actor.id === playerId) {
    throw new AppError("You cannot suspend yourself", 409);
  }
  return changeAccessOf(store, gameState, playerId, () =>
    store.setAccountSuspended(playerId, true, { actor, reason }));
}

/**
 * Reinstate a suspended user
 * @param {Object} reinstatement - { reason }
 * @param {Object} actor - { type: 'player', id } of the admin
 * @returns {Promise<Object>} The user as it is now
 * @throws {AppError} 404 if the user does not exist, 503 if the store cannot write
 */
export async function unsuspendUser(store, gameState, playerId, { reason }, actor) {
  return changeAccessOf(store, gameState, playerId, () =>
    store.setAccountSuspended(playerId, false, { actor, reason }));
}

/**
 * Close every session of a user: the access tokens and the refresh tokens stop working
 * @param {Object} revocation - { reason }
 * @param {Object} actor - { type: 'player', id } of the admin
 * @returns {Promise<Object>} The user as it is now
 * @throws {AppError} 404 if the user does not exist, 503 if the store cannot write
 */
export async function revokeUserSessions(store, gameState, playerId, { reason }, actor) {
  return changeAccessOf(store, gameState, playerId, () =>
    store.revokeAccountSessions(playerId, { actor, reason }));
}

/**
 * Reset the password of a user: the server makes a temporary one, the admin sees it once and tells it to
 * the user, who must choose their own at the next login. The sessions of the user close. The password is
 * never written anywhere: not in the audit log, not in the logs.
 * @param {Object} reset - { reason }
 * @param {Object} actor - { type: 'player', id } of the admin
 * @returns {Promise<Object>} { user, temporaryPassword }
 * @throws {AppError} 404 if the user does not exist, 409 for oneself, 503 if the store cannot write
 */
export async function resetUserPassword(store, gameState, playerId, { reason }, actor) {
  if (actor.id === playerId) {
    throw new AppError("You cannot reset your own password", 409);
  }
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const user = await changeAccessOf(store, gameState, playerId, () =>
    store.resetAccountPassword(playerId, passwordHash, { actor, reason }));
  return { user, temporaryPassword };
}

/**
 * Delete the account of a user (see deleteAccount of the account service). An admin does not delete
 * themselves from here: they have the way of every user.
 * @param {Object} deletion - { reason }
 * @param {Object} actor - { type: 'player', id } of the admin
 * @returns {Promise<Object>} { playerId, credits }
 * @throws {AppError} 404 if the user does not exist, 409 for oneself, a player in a game or the last admin, 503 if the store cannot write
 */
export async function deleteUser(store, gameState, playerId, { reason }, actor) {
  if (actor.id === playerId) {
    throw new AppError("You cannot delete your own account from the admin area", 409);
  }
  return deleteAccount(store, gameState, playerId, { reason }, actor);
}

// A game as the admin sees it: metadata only. Never the deck, the grids, the cards drawn or the balances.
const gameView = (game) => ({
  id: game.id,
  status: game.status,
  isPrivate: Boolean(game.isPrivate),
  requiredCredits: game.requiredCredits,
  maxPlayers: game.maxPlayers,
  montepremi: game.montepremi,
  createdAt: game.createdAt,
  players: game.players.map(({ id, name }) => ({ id, name })),
});

const activeGames = (gameState) =>
  Object.values(gameState.games).filter((g) => g.status !== GAME_STATUS.FINISHED);

/**
 * One page of the games that are waiting or in progress, the oldest first (the stuck ones are there)
 * @param {Object} gameState - Global game state
 * @param {Object} query - { status, page, limit }
 * @returns {Object} { items, total, page, limit }
 */
export function listGames(gameState, { status, page = 1, limit = 20 } = {}) {
  const games = activeGames(gameState)
    .filter((g) => !status || g.status === status)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  const offset = (page - 1) * limit;
  return { items: games.slice(offset, offset + limit).map(gameView), total: games.length, page, limit };
}

/**
 * Cancel a game that is waiting or in progress. If it was in progress, every player still in it gets the
 * entry fee back; the prizes awarded but not yet credited are lost, because the game counts as never
 * played. A player who left earlier already lost the fee and is not refunded. The change is made in the
 * game state at once, and undone if the store cannot write it.
 * @param {string} gameId - Game ID
 * @param {Object} cancellation - { reason }
 * @param {Object} actor - { type: 'player', id } of the admin
 * @returns {Promise<Object>} { gameId, previousStatus, players: [{ playerId, credits, refund }] }
 * @throws {AppError} 404 if the game does not exist, 409 if it is finished, 503 if the store cannot write
 */
export async function cancelGame(store, gameState, gameId, { reason }, actor) {
  const game = Object.hasOwn(gameState.games, gameId) ? gameState.games[gameId] : null;
  if (!game) {
    throw new AppError("Game not found", 404);
  }
  if (game.status === GAME_STATUS.FINISHED) {
    throw new AppError("The game is already finished", 409);
  }

  const wasPlaying = game.status === GAME_STATUS.PLAYING;
  const members = game.players
    .map(({ id }) => ({ playerId: id, player: gameState.players[id] }))
    .map((m) => ({ ...m, refund: wasPlaying && m.player ? game.requiredCredits : 0 }));

  const previousGameIds = new Map();
  delete gameState.games[gameId];
  for (const { playerId, player, refund } of members) {
    if (player) {
      previousGameIds.set(playerId, player.currentGameId);
      player.currentGameId = null;
      player.credits += refund;
    }
  }

  try {
    await store.cancelGame(
      game,
      members.filter((m) => m.refund > 0).map(({ playerId, refund }) => ({ playerId, amount: refund })),
      { actor, reason },
    );
  } catch (err) {
    gameState.games[gameId] = game;
    for (const { playerId, player, refund } of members) {
      if (player) {
        player.credits = Math.max(0, player.credits - refund);
        player.currentGameId ??= previousGameIds.get(playerId);
      }
    }
    console.error(`❌ Could not cancel game ${gameId}: ${err.message}`);
    throw new AppError(STORAGE_UNAVAILABLE, 503);
  }

  return {
    gameId,
    previousStatus: game.status,
    players: members.map(({ playerId, player, refund }) => ({ playerId, credits: player?.credits ?? 0, refund })),
  };
}

/**
 * The numbers of the platform, without naming anyone. The finished games are not all in the game state
 * (it keeps the games in progress): with a database they come from it.
 * @returns {Promise<Object>} { users, games, credits, prizesDistributed }
 */
export async function getStats(store, gameState) {
  const [{ total: registered }, admins, dbStats, cancelled] = await Promise.all([
    store.listAccounts({ limit: 1 }),
    store.countAdmins(),
    store.gameStats(),
    store.countAuditEvents({ action: "game_cancelled" }),
  ]);

  const games = Object.values(gameState.games);
  const countOf = (status) => games.filter((g) => g.status === status).length;
  const finished = games.filter((g) => g.status === GAME_STATUS.FINISHED);
  const inGame = new Set(activeGames(gameState).flatMap((g) => g.players.map((p) => p.id)));
  const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);

  return {
    users: { registered, inGame: inGame.size, admins },
    games: {
      waiting: countOf(GAME_STATUS.WAITING),
      playing: countOf(GAME_STATUS.PLAYING),
      finished: dbStats?.finished ?? finished.length,
      cancelled,
    },
    credits: {
      inCirculation: sum(Object.values(gameState.players), (p) => p.credits),
      inPlay: sum(games.filter((g) => g.status === GAME_STATUS.PLAYING), (g) => g.montepremi),
    },
    prizesDistributed: dbStats?.prizesDistributed ?? sum(finished, (g) => g.montepremi),
  };
}

/**
 * One page of the audit log, the latest first. With the game state, every event also has the
 * name of who acted and of the target (null for the system, or for a player the game does not know).
 * @param {Object} query - { targetId, page, limit }
 * @param {Object} [gameState] - Global game state, where the names are
 * @returns {Promise<Object>} { items, total, page, limit }
 */
export async function listAudit(store, { targetId, page = 1, limit = 20 } = {}, gameState = null) {
  const [events, total] = await Promise.all([
    store.listAuditEvents({ limit, offset: (page - 1) * limit, targetId }),
    store.countAuditEvents({ targetId }),
  ]);
  const nameOf = (id) => (id ? gameState.players[id]?.name ?? null : null);
  const items = gameState
    ? events.map((e) => ({ ...e, actorName: nameOf(e.actorId), targetName: nameOf(e.targetId) }))
    : events;
  return { items, total, page, limit };
}
