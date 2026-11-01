/**
 * Persistence Store
 *
 * gameState stays the in-memory source for the game logic; the store writes
 * every change through to PostgreSQL and reloads it at startup.
 *
 * Credits are only ever changed by adding a movement, so players.credits always
 * equals the sum of its credit_transactions.
 *
 * Game writes for the same game never overlap. Each write sends the latest
 * snapshot plus every movement not stored yet, so a failed write loses nothing:
 * it stays pending and is retried.
 */

const DEFAULT_RETRY_DELAY_MS = 5000;

/**
 * Store used when DATABASE_URL is not set: data lives in memory only
 * @returns {Object} Store with the same interface as the PostgreSQL one
 */
export function createMemoryStore() {
  return {
    enabled: false,
    loadState: async () => ({ players: {}, games: {} }),
    createPlayer: async () => {},
    recordPurchase: async () => {},
    saveGame: async () => {},
    deleteGame: async () => {},
    findGame: async () => null,
    status: () => ({ enabled: false, pendingWrites: 0, lastFailureAt: null }),
    close: async () => {},
  };
}

/**
 * Store backed by PostgreSQL
 * @param {Pool} pool - pg connection pool
 * @param {Object} options
 * @param {number} options.retryDelayMs - Delay before retrying a failed game write
 * @returns {Object} Store
 */
export function createPostgresStore(pool, { retryDelayMs = DEFAULT_RETRY_DELAY_MS } = {}) {
  const pending = new Map();
  let lastFailureAt = null;

  async function withTransaction(work) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async function applyMovement(client, { playerId, gameId = null, type, amount }) {
    const { rows } = await client.query(
      "UPDATE players SET credits = credits + $2, updated_at = now() WHERE id = $1 RETURNING credits",
      [playerId, amount],
    );
    if (rows.length === 0) {
      throw new Error(`Cannot apply credit movement: unknown player ${playerId}`);
    }
    await client.query(
      `INSERT INTO credit_transactions (player_id, game_id, type, amount, balance_after)
       VALUES ($1, $2, $3, $4, $5)`,
      [playerId, gameId, type, amount, rows[0].credits],
    );
  }

  function buildSnapshot(game) {
    return [
      game.id,
      game.status,
      Boolean(game.isPrivate),
      game.requiredCredits,
      game.maxPlayers,
      game.montepremi,
      JSON.stringify(game),
      game.createdAt,
    ];
  }

  async function writeEntry(gameId, entry) {
    const { snapshot, movements, deleted } = entry;
    if (!snapshot && movements.length === 0 && !deleted) {
      return;
    }

    // Detach the data being written: saves arriving meanwhile start a new batch.
    entry.snapshot = null;
    entry.movements = [];
    entry.deleted = false;

    try {
      await withTransaction(async (client) => {
        if (snapshot) {
          await client.query(
            `INSERT INTO games
               (id, status, is_private, required_credits, max_players, montepremi, state, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               is_private = EXCLUDED.is_private,
               required_credits = EXCLUDED.required_credits,
               max_players = EXCLUDED.max_players,
               montepremi = EXCLUDED.montepremi,
               state = EXCLUDED.state,
               updated_at = now()`,
            snapshot,
          );
        }
        for (const movement of movements) {
          await applyMovement(client, movement);
        }
        if (deleted) {
          await client.query("DELETE FROM games WHERE id = $1", [gameId]);
        }
      });
    } catch (err) {
      entry.snapshot = entry.snapshot || snapshot;
      entry.movements = [...movements, ...entry.movements];
      entry.deleted = entry.deleted || deleted;
      lastFailureAt = new Date().toISOString();
      scheduleRetry(gameId, entry);
      throw err;
    }

    if (!entry.snapshot && entry.movements.length === 0 && !entry.deleted) {
      pending.delete(gameId);
    }
  }

  function flush(gameId, entry) {
    const run = entry.running.catch(() => {}).then(() => writeEntry(gameId, entry));
    entry.running = run.catch(() => {});
    return run;
  }

  function scheduleRetry(gameId, entry) {
    if (entry.retryTimer) {
      return;
    }
    entry.retryTimer = setTimeout(() => {
      entry.retryTimer = null;
      flush(gameId, entry).catch((err) => {
        console.error(`❌ Retry of game ${gameId} write failed: ${err.message}`);
      });
    }, retryDelayMs);
    entry.retryTimer.unref?.();
  }

  function getEntry(gameId) {
    if (!pending.has(gameId)) {
      pending.set(gameId, {
        snapshot: null,
        movements: [],
        deleted: false,
        running: Promise.resolve(),
        retryTimer: null,
      });
    }
    return pending.get(gameId);
  }

  return {
    enabled: true,

    /**
     * Load players and active games. Finished games stay in the database and
     * are read on demand with findGame.
     * @returns {Promise<Object>} { players, games } keyed by ID
     */
    async loadState() {
      const [playerRows, gameRows] = await Promise.all([
        pool.query("SELECT id, name, credits, created_at FROM players"),
        pool.query("SELECT state FROM games WHERE status <> 'finished'"),
      ]);

      const players = {};
      for (const row of playerRows.rows) {
        players[row.id] = {
          id: row.id,
          name: row.name,
          credits: Number(row.credits),
          currentGameId: null,
          createdAt: row.created_at.toISOString(),
        };
      }

      const games = {};
      for (const { state } of gameRows.rows) {
        games[state.id] = state;
        for (const gamePlayer of state.players) {
          if (players[gamePlayer.id]) {
            players[gamePlayer.id].currentGameId = state.id;
          }
        }
      }

      return { players, games };
    },

    /**
     * Store a new player together with its starting balance
     * @param {Object} player - Player object
     */
    async createPlayer(player) {
      await withTransaction(async (client) => {
        await client.query(
          "INSERT INTO players (id, name, credits, created_at) VALUES ($1, $2, 0, $3)",
          [player.id, player.name, player.createdAt],
        );
        if (player.credits !== 0) {
          await applyMovement(client, {
            playerId: player.id,
            type: "initial",
            amount: player.credits,
          });
        }
      });
    },

    /**
     * Store a credit purchase atomically
     * @param {string} playerId - Player ID
     * @param {number} amount - Amount purchased
     */
    async recordPurchase(playerId, amount) {
      await withTransaction((client) =>
        applyMovement(client, { playerId, type: "purchase", amount }),
      );
    },

    /**
     * Store the current state of a game and its credit movements
     * @param {Object} game - Game object, serialized immediately
     * @param {Array} movements - Credit movements caused by this change
     */
    saveGame(game, movements = []) {
      const entry = getEntry(game.id);
      entry.snapshot = buildSnapshot(game);
      entry.movements.push(...movements);
      return flush(game.id, entry);
    },

    /**
     * Delete a game
     * @param {string} gameId - Game ID
     */
    deleteGame(gameId) {
      const entry = getEntry(gameId);
      entry.deleted = true;
      return flush(gameId, entry);
    },

    /**
     * Read one game from the database
     * @param {string} gameId - Game ID
     * @returns {Promise<Object|null>} Game state or null
     */
    async findGame(gameId) {
      const { rows } = await pool.query("SELECT state FROM games WHERE id = $1", [gameId]);
      return rows[0]?.state ?? null;
    },

    /**
     * Current write status, for the health endpoint
     * @returns {Object} { enabled, pendingWrites, lastFailureAt }
     */
    status() {
      return { enabled: true, pendingWrites: pending.size, lastFailureAt };
    },

    /**
     * Try once more to write pending changes, then close the pool
     */
    async close() {
      const results = await Promise.allSettled(
        [...pending.entries()].map(([gameId, entry]) => {
          clearTimeout(entry.retryTimer);
          entry.retryTimer = null;
          return flush(gameId, entry);
        }),
      );
      for (const entry of pending.values()) {
        clearTimeout(entry.retryTimer);
        entry.retryTimer = null;
      }
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        console.error(`❌ ${failed} game write(s) could not be saved before shutdown`);
      }
      await pool.end();
    },
  };
}
