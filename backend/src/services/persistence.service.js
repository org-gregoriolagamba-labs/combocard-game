/**
 * Persistence Service
 *
 * Helpers that connect the in-memory game flow to the store.
 */

export const CREDIT_MOVEMENT = {
  GAME_ENTRY: "game_entry",
  GAME_PAYOUT: "game_payout",
};

/**
 * Remember the credits of a game's players, to turn a later change into movements
 * @param {Object} gameState - Global game state
 * @param {Object} game - Game object
 * @returns {Function} Takes a movement type and returns the movements since this call
 */
export function trackCredits(gameState, game) {
  const before = new Map();
  for (const { id } of game.players) {
    const player = gameState.players[id];
    if (player) {
      before.set(id, player.credits);
    }
  }

  return (type) => {
    const movements = [];
    for (const [playerId, credits] of before) {
      const amount = gameState.players[playerId].credits - credits;
      if (amount !== 0) {
        movements.push({ playerId, gameId: game.id, type, amount });
      }
    }
    return movements;
  };
}

/**
 * Save a game without interrupting play. A failed write stays pending in the
 * store and is retried, so here it is only logged.
 * @param {Object} store - Persistence store
 * @param {Object} game - Game object
 * @param {Array} movements - Credit movements caused by this change
 */
export async function saveGameSafely(store, game, movements = []) {
  try {
    await store.saveGame(game, movements);
  } catch (err) {
    console.error(`❌ Could not save game ${game.id}, will retry: ${err.message}`);
  }
}

/**
 * Delete a game without interrupting play. See saveGameSafely.
 * @param {Object} store - Persistence store
 * @param {string} gameId - Game ID
 */
export async function deleteGameSafely(store, gameId) {
  try {
    await store.deleteGame(gameId);
  } catch (err) {
    console.error(`❌ Could not delete game ${gameId}, will retry: ${err.message}`);
  }
}
