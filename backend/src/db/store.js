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
const PG_UNIQUE_VIOLATION = "23505";

export const USERNAME_TAKEN = "USERNAME_TAKEN";

function usernameTakenError() {
  return Object.assign(new Error("Username already taken"), { code: USERNAME_TAKEN });
}

/**
 * Decide what to do with a refresh token presented for renewal.
 * - rotate: normal case, replace it with a new token
 * - grace: already replaced moments ago, for example by another tab at the same
 *   time. A new token is issued, without treating it as an attack
 * - reuse: already replaced some time ago. Someone is using an old token, which
 *   may have been stolen, so the whole family must be revoked
 * - invalid: unknown, expired or revoked
 * @param {Object|undefined} record - { expiresAt, rotatedAt, revokedAt }
 * @param {number} graceSeconds - Seconds in which an old token is still accepted
 * @param {Date} now - Current time
 * @returns {string} rotate, grace, reuse or invalid
 */
export function decideRotation(record, graceSeconds, now = new Date()) {
  if (!record || record.revokedAt || record.expiresAt <= now) {
    return "invalid";
  }
  if (!record.rotatedAt) {
    return "rotate";
  }
  const age = (now.getTime() - record.rotatedAt.getTime()) / 1000;
  return age <= graceSeconds ? "grace" : "reuse";
}

/**
 * Store used when DATABASE_URL is not set: data lives in memory only
 * @returns {Object} Store with the same interface as the PostgreSQL one
 */
export function createMemoryStore() {
  const accounts = new Map();
  const refreshTokens = new Map();

  return {
    enabled: false,
    loadState: async () => ({ players: {}, games: {} }),
    createPlayer: async () => {},
    async createAccount(player, { usernameKey, passwordHash }) {
      if (accounts.has(usernameKey)) {
        throw usernameTakenError();
      }
      accounts.set(usernameKey, { playerId: player.id, passwordHash, role: "player" });
    },
    findAccountByUsernameKey: async (usernameKey) => accounts.get(usernameKey) ?? null,
    async findAccountById(playerId) {
      return [...accounts.values()].find((a) => a.playerId === playerId) ?? null;
    },
    async createRefreshToken({ tokenHash, familyId, playerId, expiresAt }) {
      refreshTokens.set(tokenHash, {
        familyId, playerId, expiresAt, rotatedAt: null, revokedAt: null,
      });
    },
    async rotateRefreshToken(tokenHash, { tokenHash: nextHash, expiresAt, graceSeconds }) {
      const record = refreshTokens.get(tokenHash);
      const decision = decideRotation(record, graceSeconds);
      if (decision === "invalid") {
        return null;
      }
      if (decision === "reuse") {
        for (const other of refreshTokens.values()) {
          if (other.familyId === record.familyId) {
            other.revokedAt = new Date();
          }
        }
        return null;
      }
      if (decision === "rotate") {
        record.rotatedAt = new Date();
      }
      refreshTokens.set(nextHash, {
        familyId: record.familyId,
        playerId: record.playerId,
        expiresAt,
        rotatedAt: null,
        revokedAt: null,
      });
      return record.playerId;
    },
    async revokeRefreshToken(tokenHash) {
      const record = refreshTokens.get(tokenHash);
      for (const other of refreshTokens.values()) {
        if (record && other.familyId === record.familyId) {
          other.revokedAt = new Date();
        }
      }
    },
    recordPurchase: async () => {},
    recordRulesAccepted: async () => {},
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

  async function insertPlayer(client, player) {
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
  }

  async function revokeFamily(client, familyId) {
    await client.query(
      "UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL",
      [familyId],
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
      // A running jolly choice is a pause of a few seconds: it is not worth saving
      JSON.stringify(game, (key, value) => (key === "jollyInCorso" ? undefined : value)),
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
        pool.query("SELECT id, name, credits, created_at, rules_accepted_at FROM players"),
        pool.query("SELECT state FROM games WHERE status <> 'finished'"),
      ]);

      const players = {};
      for (const row of playerRows.rows) {
        players[row.id] = {
          id: row.id,
          name: row.name,
          credits: Number(row.credits),
          currentGameId: null,
          regoleAccettateIl: row.rules_accepted_at ? row.rules_accepted_at.toISOString() : null,
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
      await withTransaction((client) => insertPlayer(client, player));
    },

    /**
     * Store a new player together with their account, or neither of them
     * @param {Object} player - Player object
     * @param {Object} account - { username, usernameKey, passwordHash }
     * @throws {Error} With code USERNAME_TAKEN if the username is already in use
     */
    async createAccount(player, { username, usernameKey, passwordHash }) {
      try {
        await withTransaction(async (client) => {
          await insertPlayer(client, player);
          await client.query(
            `INSERT INTO user_accounts (player_id, username, username_key, password_hash)
             VALUES ($1, $2, $3, $4)`,
            [player.id, username, usernameKey, passwordHash],
          );
        });
      } catch (err) {
        if (err.code === PG_UNIQUE_VIOLATION && err.constraint === "user_accounts_username_key_key") {
          throw usernameTakenError();
        }
        throw err;
      }
    },

    /**
     * Find an account by its normalized username
     * @param {string} usernameKey - Normalized username
     * @returns {Promise<Object|null>} { playerId, passwordHash, role }
     */
    async findAccountByUsernameKey(usernameKey) {
      const { rows } = await pool.query(
        `SELECT player_id AS "playerId", password_hash AS "passwordHash", role
         FROM user_accounts WHERE username_key = $1`,
        [usernameKey],
      );
      return rows[0] ?? null;
    },

    /**
     * Find an account by its player
     * @param {string} playerId - Player ID
     * @returns {Promise<Object|null>} { playerId, role }
     */
    async findAccountById(playerId) {
      const { rows } = await pool.query(
        `SELECT player_id AS "playerId", role FROM user_accounts WHERE player_id = $1`,
        [playerId],
      );
      return rows[0] ?? null;
    },

    /**
     * Store the refresh token of a new session and remove the player's expired ones
     * @param {Object} token - { tokenHash, familyId, playerId, expiresAt }
     */
    async createRefreshToken({ tokenHash, familyId, playerId, expiresAt }) {
      await withTransaction(async (client) => {
        await client.query(
          "DELETE FROM refresh_tokens WHERE player_id = $1 AND expires_at < now()",
          [playerId],
        );
        await client.query(
          `INSERT INTO refresh_tokens (token_hash, family_id, player_id, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [tokenHash, familyId, playerId, expiresAt],
        );
      });
    },

    /**
     * Replace a refresh token with a new one. The row lock makes sure that two
     * requests with the same token are decided one at a time.
     * @param {string} tokenHash - Hash of the presented token
     * @param {Object} next - { tokenHash, expiresAt, graceSeconds }
     * @returns {Promise<string|null>} Player ID, or null if the session is not valid
     */
    async rotateRefreshToken(tokenHash, { tokenHash: nextHash, expiresAt, graceSeconds }) {
      return withTransaction(async (client) => {
        const { rows } = await client.query(
          `SELECT id, family_id AS "familyId", player_id AS "playerId", expires_at AS "expiresAt",
                  rotated_at AS "rotatedAt", revoked_at AS "revokedAt"
           FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
          [tokenHash],
        );
        const record = rows[0];
        const decision = decideRotation(record, graceSeconds);

        if (decision === "invalid") {
          return null;
        }
        if (decision === "reuse") {
          await revokeFamily(client, record.familyId);
          return null;
        }
        if (decision === "rotate") {
          await client.query("UPDATE refresh_tokens SET rotated_at = now() WHERE id = $1", [record.id]);
        }
        await client.query(
          `INSERT INTO refresh_tokens (token_hash, family_id, player_id, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [nextHash, record.familyId, record.playerId, expiresAt],
        );
        return record.playerId;
      });
    },

    /**
     * End a session by revoking the whole family of its token
     * @param {string} tokenHash - Hash of the presented token
     */
    async revokeRefreshToken(tokenHash) {
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = now()
         WHERE revoked_at IS NULL
           AND family_id = (SELECT family_id FROM refresh_tokens WHERE token_hash = $1)`,
        [tokenHash],
      );
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
    /**
     * Save that a player confirmed they read the rules
     * @param {string} playerId - Player ID
     * @param {string} isoDate - When it was confirmed
     */
    async recordRulesAccepted(playerId, isoDate) {
      await pool.query(
        "UPDATE players SET rules_accepted_at = $2, updated_at = now() WHERE id = $1",
        [playerId, isoDate],
      );
    },

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
