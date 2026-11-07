/**
 * Account Service
 *
 * Deleting an account: what an admin does to a user, and what a user does to themselves. The store
 * writes everything in one transaction (see deleteAccount); here are the rules about the game.
 */

import { AppError } from "../utils/AppError.js";
import { activeGameOf } from "./game.service.js";
import { anonymizePlayerIn, LAST_ADMIN, PLAYER_IN_GAME } from "../db/store.js";

const STORAGE_UNAVAILABLE = "Storage temporarily unavailable, please try again";

/**
 * Delete an account. The player goes out of the game state and, in the games already finished that the
 * game state still holds, their name is replaced. Nobody who is in a game that is waiting or in progress
 * is deleted (they must leave it, or an admin cancels it), nor the last active admin.
 * @param {Object} deletion - { reason }: required for an admin, not for the user themselves
 * @param {Object} actor - { type: 'player', id }: the admin, or the user themselves
 * @returns {Promise<Object>} { playerId, credits }: the balance that was closed
 * @throws {AppError} 404 if the account does not exist, 409 for a player in a game or the last admin, 503 if the store cannot write
 */
export async function deleteAccount(store, gameState, playerId, { reason } = {}, actor) {
  const player = Object.hasOwn(gameState.players, playerId) ? gameState.players[playerId] : null;
  if (!player) {
    throw new AppError("User not found", 404);
  }
  // The user deleting themselves reads the refusals as being about them
  const itself = actor.type === "player" && actor.id === playerId;
  const inGame = () =>
    new AppError(itself ? "You cannot delete your account while you are in a game" : "Cannot delete a player who is in a game", 409);
  if (activeGameOf(gameState, playerId)) {
    throw inGame();
  }

  // From here the token of the player is not accepted, so no game can be joined while the store writes
  // (this runs without any await between the check above and the mark)
  player.deleting = true;
  let deleted;
  try {
    deleted = await store.deleteAccount(playerId, { actor, reason });
  } catch (err) {
    delete player.deleting;
    if (err.code === LAST_ADMIN) {
      throw new AppError(itself ? "You are the last active admin: make another admin first" : "Cannot delete the last admin", 409);
    }
    if (err.code === PLAYER_IN_GAME) {
      throw inGame();
    }
    console.error(`❌ Could not delete the account of player ${playerId}: ${err.message}`);
    throw new AppError(STORAGE_UNAVAILABLE, 503);
  }
  if (!deleted) {
    delete player.deleting;
    throw new AppError("User not found", 404);
  }

  const credits = player.credits;
  delete gameState.players[playerId];
  for (const game of Object.values(gameState.games)) {
    anonymizePlayerIn(game, playerId);
  }
  return { playerId, credits };
}
