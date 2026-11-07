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

import { ACCOUNT_ROLES } from "../config/constants.js";

const DEFAULT_RETRY_DELAY_MS = 5000;
const PG_UNIQUE_VIOLATION = "23505";

export const USERNAME_TAKEN = "USERNAME_TAKEN";
export const LAST_ADMIN = "LAST_ADMIN";
export const INVALID_ROLE = "INVALID_ROLE";
export const INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS";
export const PLAYER_IN_GAME = "PLAYER_IN_GAME";

// What the name of a player who deleted the account (or whose account was deleted) becomes
export const DELETED_PLAYER_NAME = "Utente eliminato";

const ACTOR_TYPES = ["system", "player"];
// Role changes are rare: one lock for all of them keeps the count of admins exact
const ROLE_LOCK_ID = 7203115;

function usernameTakenError() {
  return Object.assign(new Error("Username already taken"), { code: USERNAME_TAKEN });
}

function lastAdminError() {
  return Object.assign(new Error("The last admin cannot be demoted or suspended"), { code: LAST_ADMIN });
}

/**
 * A role change needs a role that exists and who is making it: nothing changes without a trace
 * @param {string} role - New role
 * @param {Object} actor - { type: 'system' } or { type: 'player', id }
 */
function assertRoleChange(role, actor) {
  if (!ACCOUNT_ROLES.includes(role)) {
    throw Object.assign(new Error(`Invalid role: ${role}`), { code: INVALID_ROLE });
  }
  assertActor(actor);
}

/**
 * Nothing changes without a trace: whoever acts must be known
 * @param {Object} actor - { type: 'system' } or { type: 'player', id }
 */
function assertActor(actor) {
  if (!actor || !ACTOR_TYPES.includes(actor.type) || (actor.type === "player" && !actor.id)) {
    throw new TypeError("This change needs the actor: { type: 'system' } or { type: 'player', id }");
  }
}

/**
 * A credit adjustment is a whole amount that is not zero, with a reason and the one who makes it
 * @param {number} amount - Credits to add (positive) or take away (negative)
 * @param {string} reason - Why
 * @param {Object} actor - { type: 'system' } or { type: 'player', id }
 */
function assertCreditAdjustment(amount, reason, actor) {
  if (!Number.isSafeInteger(amount) || amount === 0) {
    throw new TypeError("A credit adjustment needs a whole amount that is not zero");
  }
  if (typeof reason !== "string" || reason.trim() === "") {
    throw new TypeError("A credit adjustment needs a reason");
  }
  assertActor(actor);
}

/**
 * Cancelling a game needs a reason and who does it: nothing changes without a trace
 * @param {string} reason - Why
 * @param {Object} actor - { type: 'system' } or { type: 'player', id }
 */
function assertGameCancellation(reason, actor) {
  if (typeof reason !== "string" || reason.trim() === "") {
    throw new TypeError("Cancelling a game needs a reason");
  }
  assertActor(actor);
}

/**
 * Suspending an account, reinstating it or closing its sessions needs a reason and who does it
 * @param {string} reason - Why
 * @param {Object} actor - { type: 'system' } or { type: 'player', id }
 */
function assertAccountAction(reason, actor) {
  if (typeof reason !== "string" || reason.trim() === "") {
    throw new TypeError("This change needs a reason");
  }
  assertActor(actor);
}

// The account as the authentication reads it
const authView = (account) => ({
  playerId: account.playerId,
  role: account.role,
  suspended: Boolean(account.suspendedAt),
  sessionVersion: account.sessionVersion,
  mustChangePassword: Boolean(account.mustChangePassword),
});

/**
 * Replace the name of a player wherever a game state names them: an object with the id of the player
 * and a name (the players of the game, the winners of a collection). The id stays.
 * @param {*} value - A game state, or any part of it (changed in place)
 * @param {string} playerId - Player ID
 * @returns {*} The same value
 */
export function anonymizePlayerIn(value, playerId) {
  if (Array.isArray(value)) {
    value.forEach((item) => anonymizePlayerIn(item, playerId));
  } else if (value && typeof value === "object") {
    if (value.id === playerId && typeof value.name === "string") {
      value.name = DELETED_PLAYER_NAME;
    }
    Object.values(value).forEach((item) => anonymizePlayerIn(item, playerId));
  }
  return value;
}

// What the audit log keeps of a deleted account: never the username
const deletionDetails = (account, reason, actor, playerId) => ({
  role: account.role,
  reason: typeof reason === "string" && reason.trim() !== "" ? reason.trim() : null,
  self: actor.type === "player" && actor.id === playerId,
});

// What the audit log keeps of a cancelled game
const cancellationDetails = (game, refunds, reason) => ({
  reason: reason.trim(),
  previousStatus: game.status,
  refunds: refunds.map(({ playerId, amount }) => ({ playerId, amount })),
});

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
  const audit = [];

  const toProfile = ({ playerId, username, role, createdAt, suspendedAt }) => ({
    playerId,
    username,
    role,
    createdAt,
    suspended: Boolean(suspendedAt),
  });
  const activeAdmins = () => [...accounts.values()].filter((a) => a.role === "admin" && !a.suspendedAt);
  const revokeTokensOf = (playerId) => {
    for (const token of refreshTokens.values()) {
      if (token.playerId === playerId) {
        token.revokedAt ??= new Date();
      }
    }
  };
  const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const pushAudit = (actor, action, targetId, details) => {
    audit.push({
      id: audit.length + 1,
      actorType: actor.type,
      actorId: actor.id ?? null,
      action,
      targetId,
      details,
      createdAt: new Date(),
    });
  };

  return {
    enabled: false,
    loadState: async () => ({ players: {}, games: {} }),
    createPlayer: async () => {},
    async createAccount(player, { username, usernameKey, passwordHash }) {
      if (accounts.has(usernameKey)) {
        throw usernameTakenError();
      }
      accounts.set(usernameKey, {
        playerId: player.id,
        username: username ?? usernameKey,
        usernameKey,
        passwordHash,
        role: "player",
        createdAt: new Date(),
        suspendedAt: null,
        sessionVersion: 0,
        mustChangePassword: false,
      });
    },
    async findAccountByUsernameKey(usernameKey) {
      const account = accounts.get(usernameKey);
      return account ? { ...account, ...authView(account) } : null;
    },
    async getAccount(playerId) {
      const account = [...accounts.values()].find((a) => a.playerId === playerId);
      return account ? toProfile(account) : null;
    },
    async listAccounts({ q = "", role = null, limit = 20, offset = 0 } = {}) {
      const needle = q.trim().toLowerCase();
      const matching = [...accounts.values()]
        .filter((a) => (!needle || a.usernameKey.includes(needle)) && (!role || a.role === role))
        .sort((a, b) => compareText(a.usernameKey, b.usernameKey) || compareText(a.playerId, b.playerId));
      return { items: matching.slice(offset, offset + limit).map(toProfile), total: matching.length };
    },
    async setAccountUsername(playerId, { username, usernameKey }, { actor } = {}) {
      assertActor(actor);
      const account = [...accounts.values()].find((a) => a.playerId === playerId);
      if (!account) {
        return null;
      }
      const previousUsername = account.username;
      if (previousUsername === username) {
        return { playerId, username, previousUsername, changed: false };
      }
      if (usernameKey !== account.usernameKey && accounts.has(usernameKey)) {
        throw usernameTakenError();
      }
      accounts.delete(account.usernameKey);
      Object.assign(account, { username, usernameKey });
      accounts.set(usernameKey, account);
      pushAudit(actor, "username_changed", playerId, { from: previousUsername, to: username });
      return { playerId, username, previousUsername, changed: true };
    },
    // The balance is in the game state: here only the trace is written
    async adjustCredits(playerId, amount, { actor, reason } = {}) {
      assertCreditAdjustment(amount, reason, actor);
      if (![...accounts.values()].some((a) => a.playerId === playerId)) {
        return null;
      }
      pushAudit(actor, "credits_adjusted", playerId, { amount, reason: reason.trim() });
      return { playerId, amount };
    },
    async findAccountById(playerId) {
      const account = [...accounts.values()].find((a) => a.playerId === playerId);
      return account ? authView(account) : null;
    },
    async setAccountSuspended(playerId, suspended, { actor, reason } = {}) {
      assertAccountAction(reason, actor);
      const account = [...accounts.values()].find((a) => a.playerId === playerId);
      if (!account) {
        return null;
      }
      const previousSuspended = Boolean(account.suspendedAt);
      if (previousSuspended === suspended) {
        return { playerId, suspended, previousSuspended, changed: false };
      }
      if (suspended && account.role === "admin" && activeAdmins().length <= 1) {
        throw lastAdminError();
      }
      account.suspendedAt = suspended ? new Date() : null;
      if (suspended) {
        account.sessionVersion += 1;
        revokeTokensOf(playerId);
      }
      pushAudit(actor, suspended ? "user_suspended" : "user_unsuspended", playerId, { reason: reason.trim() });
      return { playerId, suspended, previousSuspended, changed: true };
    },
    async getPasswordHash(playerId) {
      return [...accounts.values()].find((a) => a.playerId === playerId)?.passwordHash ?? null;
    },
    async resetAccountPassword(playerId, passwordHash, { actor, reason } = {}) {
      assertAccountAction(reason, actor);
      const account = [...accounts.values()].find((a) => a.playerId === playerId);
      if (!account) {
        return null;
      }
      Object.assign(account, { passwordHash, mustChangePassword: true });
      account.sessionVersion += 1;
      revokeTokensOf(playerId);
      pushAudit(actor, "password_reset", playerId, { reason: reason.trim() });
      return { playerId };
    },
    async changeAccountPassword(playerId, passwordHash, { actor } = {}) {
      assertActor(actor);
      const account = [...accounts.values()].find((a) => a.playerId === playerId);
      if (!account) {
        return null;
      }
      Object.assign(account, { passwordHash, mustChangePassword: false });
      account.sessionVersion += 1;
      revokeTokensOf(playerId);
      pushAudit(actor, "password_changed", playerId, {});
      return { playerId, sessionVersion: account.sessionVersion };
    },
    async revokeAccountSessions(playerId, { actor, reason } = {}) {
      assertAccountAction(reason, actor);
      const account = [...accounts.values()].find((a) => a.playerId === playerId);
      if (!account) {
        return null;
      }
      account.sessionVersion += 1;
      revokeTokensOf(playerId);
      pushAudit(actor, "sessions_revoked", playerId, { reason: reason.trim() });
      return { playerId };
    },
    async deleteAccount(playerId, { actor, reason } = {}) {
      assertActor(actor);
      const account = [...accounts.values()].find((a) => a.playerId === playerId);
      if (!account) {
        return null;
      }
      if (account.role === "admin" && !account.suspendedAt && activeAdmins().length <= 1) {
        throw lastAdminError();
      }
      accounts.delete(account.usernameKey);
      for (const [hash, token] of refreshTokens) {
        if (token.playerId === playerId) {
          refreshTokens.delete(hash);
        }
      }
      for (const event of audit) {
        if (event.targetId === playerId && event.action === "username_changed") {
          event.details = { from: DELETED_PLAYER_NAME, to: DELETED_PLAYER_NAME };
        }
      }
      pushAudit(actor, "user_deleted", playerId, deletionDetails(account, reason, actor, playerId));
      return { playerId };
    },
    async setAccountRole(playerId, role, { actor } = {}) {
      assertRoleChange(role, actor);
      const account = [...accounts.values()].find((a) => a.playerId === playerId);
      if (!account) {
        return null;
      }
      const previousRole = account.role;
      if (previousRole === role) {
        return { playerId, role, previousRole, changed: false };
      }
      // A suspended admin is not one of the admins who can act: demoting them leaves the others as they are
      if (previousRole === "admin" && !account.suspendedAt && activeAdmins().length <= 1) {
        throw lastAdminError();
      }
      account.role = role;
      pushAudit(actor, "role_changed", playerId, { from: previousRole, to: role });
      return { playerId, role, previousRole, changed: true };
    },
    async countAdmins() {
      return [...accounts.values()].filter((a) => a.role === "admin").length;
    },
    async listAuditEvents({ limit = 100, offset = 0, targetId = null } = {}) {
      return audit.filter((e) => !targetId || e.targetId === targetId).reverse().slice(offset, offset + limit);
    },
    async countAuditEvents({ targetId = null, action = null } = {}) {
      return audit.filter((e) => (!targetId || e.targetId === targetId) && (!action || e.action === action)).length;
    },
    async cancelGame(game, refunds, { actor, reason } = {}) {
      assertGameCancellation(reason, actor);
      pushAudit(actor, "game_cancelled", game.id, cancellationDetails(game, refunds, reason));
    },
    // The games of this store are all in the game state, where the service counts them
    gameStats: async () => null,
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
    // The balance never goes below zero: a movement that would make it negative changes nothing
    const { rows } = await client.query(
      `UPDATE players SET credits = credits + $2, updated_at = now()
       WHERE id = $1 AND credits + $2 >= 0 RETURNING credits`,
      [playerId, amount],
    );
    if (rows.length === 0) {
      const { rows: known } = await client.query("SELECT 1 FROM players WHERE id = $1", [playerId]);
      if (known.length > 0) {
        throw Object.assign(
          new Error(`Cannot apply credit movement: player ${playerId} does not have ${-amount} credits`),
          { code: INSUFFICIENT_CREDITS },
        );
      }
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

  async function revokeTokensOf(client, playerId) {
    await client.query(
      "UPDATE refresh_tokens SET revoked_at = now() WHERE player_id = $1 AND revoked_at IS NULL",
      [playerId],
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
        pool.query("SELECT id, name, credits, created_at, rules_accepted_at FROM players WHERE deleted_at IS NULL"),
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
     * @returns {Promise<Object|null>} { playerId, passwordHash, role, suspended, sessionVersion, mustChangePassword }
     */
    async findAccountByUsernameKey(usernameKey) {
      const { rows } = await pool.query(
        `SELECT player_id AS "playerId", password_hash AS "passwordHash", role,
                suspended_at IS NOT NULL AS suspended, session_version AS "sessionVersion",
                must_change_password AS "mustChangePassword"
         FROM user_accounts WHERE username_key = $1`,
        [usernameKey],
      );
      return rows[0] ?? null;
    },

    /**
     * Find an account by its player
     * @param {string} playerId - Player ID
     * @returns {Promise<Object|null>} { playerId, role, suspended, sessionVersion, mustChangePassword }
     */
    async findAccountById(playerId) {
      const { rows } = await pool.query(
        `SELECT player_id AS "playerId", role, suspended_at IS NOT NULL AS suspended,
                session_version AS "sessionVersion", must_change_password AS "mustChangePassword"
         FROM user_accounts WHERE player_id = $1`,
        [playerId],
      );
      return rows[0] ?? null;
    },

    /**
     * Change the role of an account, and write who did it in the audit log, in one transaction.
     * The last admin cannot be demoted, even by two requests at the same time.
     * @param {string} playerId - Player of the account
     * @param {string} role - 'player' or 'admin'
     * @param {Object} options - { actor }: { type: 'system' } or { type: 'player', id }
     * @returns {Promise<Object|null>} { playerId, role, previousRole, changed }, or null if there is no account
     * @throws {Error} With code LAST_ADMIN or INVALID_ROLE
     */
    async setAccountRole(playerId, role, { actor } = {}) {
      assertRoleChange(role, actor);
      return withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock($1)", [ROLE_LOCK_ID]);
        const { rows } = await client.query(
          "SELECT role, suspended_at IS NOT NULL AS suspended FROM user_accounts WHERE player_id = $1",
          [playerId],
        );
        if (rows.length === 0) {
          return null;
        }

        const previousRole = rows[0].role;
        if (previousRole === role) {
          return { playerId, role, previousRole, changed: false };
        }
        // A suspended admin is not one of the admins who can act: demoting them leaves the others as they are
        if (previousRole === "admin" && !rows[0].suspended) {
          const { rows: [{ count }] } = await client.query(
            "SELECT count(*) AS count FROM user_accounts WHERE role = 'admin' AND suspended_at IS NULL",
          );
          if (Number(count) <= 1) {
            throw lastAdminError();
          }
        }

        await client.query("UPDATE user_accounts SET role = $2 WHERE player_id = $1", [playerId, role]);
        await client.query(
          `INSERT INTO audit_log (actor_type, actor_id, action, target_id, details)
           VALUES ($1, $2, 'role_changed', $3, $4)`,
          [actor.type, actor.id ?? null, playerId, JSON.stringify({ from: previousRole, to: role })],
        );
        return { playerId, role, previousRole, changed: true };
      });
    },

    /**
     * Suspend an account or reinstate it, with the trace, in one transaction. Suspending also closes the
     * sessions: the version moves on and the refresh tokens are revoked. The last active admin cannot
     * be suspended, even by two requests at the same time.
     * @param {string} playerId - Player of the account
     * @param {boolean} suspended - True to suspend, false to reinstate
     * @param {Object} options - { actor, reason }
     * @returns {Promise<Object|null>} { playerId, suspended, previousSuspended, changed }, or null if there is no account
     * @throws {Error} With code LAST_ADMIN
     */
    async setAccountSuspended(playerId, suspended, { actor, reason } = {}) {
      assertAccountAction(reason, actor);
      return withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock($1)", [ROLE_LOCK_ID]);
        const { rows } = await client.query(
          "SELECT role, suspended_at IS NOT NULL AS suspended FROM user_accounts WHERE player_id = $1",
          [playerId],
        );
        if (rows.length === 0) {
          return null;
        }

        const previousSuspended = rows[0].suspended;
        if (previousSuspended === suspended) {
          return { playerId, suspended, previousSuspended, changed: false };
        }
        if (suspended && rows[0].role === "admin") {
          const { rows: [{ count }] } = await client.query(
            "SELECT count(*) AS count FROM user_accounts WHERE role = 'admin' AND suspended_at IS NULL",
          );
          if (Number(count) <= 1) {
            throw lastAdminError();
          }
        }

        if (suspended) {
          await client.query(
            "UPDATE user_accounts SET suspended_at = now(), session_version = session_version + 1 WHERE player_id = $1",
            [playerId],
          );
          await revokeTokensOf(client, playerId);
        } else {
          await client.query("UPDATE user_accounts SET suspended_at = NULL WHERE player_id = $1", [playerId]);
        }
        await client.query(
          `INSERT INTO audit_log (actor_type, actor_id, action, target_id, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            actor.type,
            actor.id ?? null,
            suspended ? "user_suspended" : "user_unsuspended",
            playerId,
            JSON.stringify({ reason: reason.trim() }),
          ],
        );
        return { playerId, suspended, previousSuspended, changed: true };
      });
    },

    /**
     * Delete an account, with the trace, in one transaction: the balance is closed with a movement, the
     * player stays anonymized (so the movements stay whole), the account and the tokens go, the name is
     * replaced in the finished games and in the earlier events of the audit log, and the audit row of the
     * deletion is written without the username. What is still waiting to be written for the games is
     * written first, so nothing arrives for the player afterwards. The last active admin cannot be deleted
     * (not even by two requests at the same time) and neither can a player who is in a game that is not finished.
     * @param {string} playerId - Player of the account
     * @param {Object} options - { actor, reason }: the reason is for the admin, the user themselves needs none
     * @returns {Promise<Object|null>} { playerId }, or null if there is no account
     * @throws {Error} With code LAST_ADMIN or PLAYER_IN_GAME
     */
    async deleteAccount(playerId, { actor, reason } = {}) {
      assertActor(actor);
      await Promise.all([...pending.entries()].map(([gameId, entry]) => flush(gameId, entry)));

      return withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock($1)", [ROLE_LOCK_ID]);
        const { rows } = await client.query(
          "SELECT role, suspended_at IS NOT NULL AS suspended FROM user_accounts WHERE player_id = $1 FOR UPDATE",
          [playerId],
        );
        if (rows.length === 0) {
          return null;
        }
        const account = rows[0];
        if (account.role === "admin" && !account.suspended) {
          const { rows: [{ count }] } = await client.query(
            "SELECT count(*) AS count FROM user_accounts WHERE role = 'admin' AND suspended_at IS NULL",
          );
          if (Number(count) <= 1) {
            throw lastAdminError();
          }
        }

        const inPlayers = JSON.stringify([{ id: playerId }]);
        const { rows: active } = await client.query(
          "SELECT 1 FROM games WHERE status <> 'finished' AND state->'players' @> $1::jsonb LIMIT 1",
          [inPlayers],
        );
        if (active.length > 0) {
          throw Object.assign(new Error(`Player ${playerId} is in a game that is not finished`), { code: PLAYER_IN_GAME });
        }

        const { rows: [{ credits }] } = await client.query("SELECT credits FROM players WHERE id = $1 FOR UPDATE", [playerId]);
        if (Number(credits) > 0) {
          await applyMovement(client, { playerId, type: "account_closed", amount: -Number(credits) });
        }
        await client.query("UPDATE players SET name = $2, deleted_at = now(), updated_at = now() WHERE id = $1", [playerId, DELETED_PLAYER_NAME]);
        await client.query("DELETE FROM user_accounts WHERE player_id = $1", [playerId]);
        await client.query("DELETE FROM refresh_tokens WHERE player_id = $1", [playerId]);

        const { rows: games } = await client.query("SELECT id, state FROM games WHERE state->'players' @> $1::jsonb", [inPlayers]);
        for (const { id, state } of games) {
          await client.query("UPDATE games SET state = $2 WHERE id = $1", [id, JSON.stringify(anonymizePlayerIn(state, playerId))]);
        }
        await client.query(
          `UPDATE audit_log SET details = $2 WHERE action = 'username_changed' AND target_id = $1`,
          [playerId, JSON.stringify({ from: DELETED_PLAYER_NAME, to: DELETED_PLAYER_NAME })],
        );
        await client.query(
          `INSERT INTO audit_log (actor_type, actor_id, action, target_id, details)
           VALUES ($1, $2, 'user_deleted', $3, $4)`,
          [actor.type, actor.id ?? null, playerId, JSON.stringify(deletionDetails(account, reason, actor, playerId))],
        );
        return { playerId };
      });
    },

    /**
     * The hash of the password of an account, only to check a password that is being changed: no
     * other read of an account returns it by id
     * @param {string} playerId - Player of the account
     * @returns {Promise<string|null>} The hash, or null if there is no account
     */
    async getPasswordHash(playerId) {
      const { rows } = await pool.query("SELECT password_hash AS hash FROM user_accounts WHERE player_id = $1", [playerId]);
      return rows[0]?.hash ?? null;
    },

    /**
     * An admin resets a password: the hash is replaced, the account must change it at the next login,
     * the sessions close, with the trace, in one transaction. The audit row never holds the password.
     * @param {string} playerId - Player of the account
     * @param {string} passwordHash - Hash of the temporary password
     * @param {Object} options - { actor, reason }
     * @returns {Promise<Object|null>} { playerId }, or null if there is no account
     */
    async resetAccountPassword(playerId, passwordHash, { actor, reason } = {}) {
      assertAccountAction(reason, actor);
      return withTransaction(async (client) => {
        const { rowCount } = await client.query(
          `UPDATE user_accounts
           SET password_hash = $2, must_change_password = true, session_version = session_version + 1
           WHERE player_id = $1`,
          [playerId, passwordHash],
        );
        if (rowCount === 0) {
          return null;
        }
        await revokeTokensOf(client, playerId);
        await client.query(
          `INSERT INTO audit_log (actor_type, actor_id, action, target_id, details)
           VALUES ($1, $2, 'password_reset', $3, $4)`,
          [actor.type, actor.id ?? null, playerId, JSON.stringify({ reason: reason.trim() })],
        );
        return { playerId };
      });
    },

    /**
     * A user chooses a new password: the hash is replaced, the obligation to change it is cleared and
     * every session closes (the caller opens a new one with the version returned), with the trace, in
     * one transaction
     * @param {string} playerId - Player of the account
     * @param {string} passwordHash - Hash of the new password
     * @param {Object} options - { actor }
     * @returns {Promise<Object|null>} { playerId, sessionVersion }, or null if there is no account
     */
    async changeAccountPassword(playerId, passwordHash, { actor } = {}) {
      assertActor(actor);
      return withTransaction(async (client) => {
        const { rows } = await client.query(
          `UPDATE user_accounts
           SET password_hash = $2, must_change_password = false, session_version = session_version + 1
           WHERE player_id = $1 RETURNING session_version AS "sessionVersion"`,
          [playerId, passwordHash],
        );
        if (rows.length === 0) {
          return null;
        }
        await revokeTokensOf(client, playerId);
        await client.query(
          `INSERT INTO audit_log (actor_type, actor_id, action, target_id, details)
           VALUES ($1, $2, 'password_changed', $3, '{}')`,
          [actor.type, actor.id ?? null, playerId],
        );
        return { playerId, sessionVersion: rows[0].sessionVersion };
      });
    },

    /**
     * Close every session of an account: the version moves on, so the access tokens signed before stop
     * working, and the refresh tokens are revoked. With the trace, in one transaction.
     * @param {string} playerId - Player of the account
     * @param {Object} options - { actor, reason }
     * @returns {Promise<Object|null>} { playerId }, or null if there is no account
     */
    async revokeAccountSessions(playerId, { actor, reason } = {}) {
      assertAccountAction(reason, actor);
      return withTransaction(async (client) => {
        const { rowCount } = await client.query(
          "UPDATE user_accounts SET session_version = session_version + 1 WHERE player_id = $1",
          [playerId],
        );
        if (rowCount === 0) {
          return null;
        }
        await revokeTokensOf(client, playerId);
        await client.query(
          `INSERT INTO audit_log (actor_type, actor_id, action, target_id, details)
           VALUES ($1, $2, 'sessions_revoked', $3, $4)`,
          [actor.type, actor.id ?? null, playerId, JSON.stringify({ reason: reason.trim() })],
        );
        return { playerId };
      });
    },

    /**
     * One account, as the admin area shows it
     * @param {string} playerId - Player ID
     * @returns {Promise<Object|null>} { playerId, username, role, createdAt }, or null
     */
    async getAccount(playerId) {
      const { rows } = await pool.query(
        `SELECT player_id AS "playerId", username, role, created_at AS "createdAt",
                suspended_at IS NOT NULL AS suspended
         FROM user_accounts WHERE player_id = $1`,
        [playerId],
      );
      return rows[0] ?? null;
    },

    /**
     * The accounts, a page at a time, by name. The password hash is never read.
     * @param {Object} options - { q, role, limit, offset }: q is a part of the normalized name
     * @returns {Promise<Object>} { items: [{ playerId, username, role, createdAt }], total }
     */
    async listAccounts({ q = "", role = null, limit = 20, offset = 0 } = {}) {
      const needle = q.trim().toLowerCase();
      const conditions = [];
      const params = [];
      if (needle) {
        // The characters of a pattern are searched as they are
        params.push(`%${needle.replace(/[\\%_]/g, "\\$&")}%`);
        conditions.push(`username_key LIKE $${params.length}`);
      }
      if (role) {
        params.push(role);
        conditions.push(`role = $${params.length}`);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const { rows: [{ count }] } = await pool.query(`SELECT count(*) AS count FROM user_accounts ${where}`, params);
      const { rows } = await pool.query(
        `SELECT player_id AS "playerId", username, role, created_at AS "createdAt",
                suspended_at IS NOT NULL AS suspended
         FROM user_accounts ${where}
         ORDER BY username_key COLLATE "C", player_id
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      );
      return { items: rows, total: Number(count) };
    },

    /**
     * Rename an account and its player, with the trace, in one transaction
     * @param {string} playerId - Player of the account
     * @param {Object} name - { username, usernameKey }: the name as written and its normalized form
     * @param {Object} options - { actor }
     * @returns {Promise<Object|null>} { playerId, username, previousUsername, changed }, or null if there is no account
     * @throws {Error} With code USERNAME_TAKEN if another account has the name
     */
    async setAccountUsername(playerId, { username, usernameKey }, { actor } = {}) {
      assertActor(actor);
      try {
        return await withTransaction(async (client) => {
          const { rows } = await client.query(
            "SELECT username FROM user_accounts WHERE player_id = $1 FOR UPDATE",
            [playerId],
          );
          if (rows.length === 0) {
            return null;
          }

          const previousUsername = rows[0].username;
          if (previousUsername === username) {
            return { playerId, username, previousUsername, changed: false };
          }

          await client.query(
            "UPDATE user_accounts SET username = $2, username_key = $3 WHERE player_id = $1",
            [playerId, username, usernameKey],
          );
          await client.query("UPDATE players SET name = $2, updated_at = now() WHERE id = $1", [playerId, username]);
          await client.query(
            `INSERT INTO audit_log (actor_type, actor_id, action, target_id, details)
             VALUES ($1, $2, 'username_changed', $3, $4)`,
            [actor.type, actor.id ?? null, playerId, JSON.stringify({ from: previousUsername, to: username })],
          );
          return { playerId, username, previousUsername, changed: true };
        });
      } catch (err) {
        if (err.code === PG_UNIQUE_VIOLATION && err.constraint === "user_accounts_username_key_key") {
          throw usernameTakenError();
        }
        throw err;
      }
    },

    /**
     * Add or take away credits: the movement, the balance and the audit row, in one transaction.
     * The balance never goes below zero.
     * @param {string} playerId - Player ID
     * @param {number} amount - Whole number of credits, positive or negative
     * @param {Object} options - { actor, reason }
     * @returns {Promise<Object|null>} { playerId, amount }, or null if the player does not exist
     * @throws {Error} With code INSUFFICIENT_CREDITS if the balance is not enough
     */
    async adjustCredits(playerId, amount, { actor, reason } = {}) {
      assertCreditAdjustment(amount, reason, actor);
      return withTransaction(async (client) => {
        const { rows } = await client.query("SELECT 1 FROM players WHERE id = $1", [playerId]);
        if (rows.length === 0) {
          return null;
        }

        await applyMovement(client, { playerId, type: "admin_adjustment", amount });
        await client.query(
          `INSERT INTO audit_log (actor_type, actor_id, action, target_id, details)
           VALUES ($1, $2, 'credits_adjusted', $3, $4)`,
          [actor.type, actor.id ?? null, playerId, JSON.stringify({ amount, reason: reason.trim() })],
        );
        return { playerId, amount };
      });
    },

    /**
     * Number of admins
     * @returns {Promise<number>} Accounts with the admin role
     */
    async countAdmins() {
      const { rows } = await pool.query("SELECT count(*) AS count FROM user_accounts WHERE role = 'admin'");
      return Number(rows[0].count);
    },

    /**
     * Cancel a game: the entry fees given back, the game removed and the audit row, in one transaction.
     * What is still waiting to be written for the game (the entry fee, for instance) is written first,
     * so the refund never comes before the charge; if that cannot be written, nothing is cancelled.
     * @param {Object} game - The game, as it was
     * @param {Object[]} refunds - { playerId, amount } for each player who gets credits back
     * @param {Object} options - { actor, reason }
     */
    async cancelGame(game, refunds, { actor, reason } = {}) {
      assertGameCancellation(reason, actor);
      const entry = pending.get(game.id);
      if (entry) {
        await flush(game.id, entry);
      }
      await withTransaction(async (client) => {
        for (const { playerId, amount } of refunds) {
          // Without the game: it is deleted here, and the audit row says which game it was
          await applyMovement(client, { playerId, type: "game_refund", amount });
        }
        await client.query("DELETE FROM games WHERE id = $1", [game.id]);
        await client.query(
          `INSERT INTO audit_log (actor_type, actor_id, action, target_id, details)
           VALUES ($1, $2, 'game_cancelled', $3, $4)`,
          [actor.type, actor.id ?? null, game.id, JSON.stringify(cancellationDetails(game, refunds, reason))],
        );
      });
    },

    /**
     * The finished games and the prizes they distributed: only the database has them all, because
     * the game state keeps the games in progress
     * @returns {Promise<Object>} { finished, prizesDistributed }
     */
    async gameStats() {
      const { rows } = await pool.query(
        "SELECT count(*) AS finished, COALESCE(SUM(montepremi), 0) AS prizes FROM games WHERE status = 'finished'",
      );
      return { finished: Number(rows[0].finished), prizesDistributed: Number(rows[0].prizes) };
    },

    /**
     * The latest events of the audit log
     * @param {Object} options - { limit } (default 100)
     * @returns {Promise<Object[]>} { id, actorType, actorId, action, targetId, details, createdAt }, latest first
     */
    async listAuditEvents({ limit = 100, offset = 0, targetId = null } = {}) {
      const { rows } = await pool.query(
        `SELECT id, actor_type AS "actorType", actor_id AS "actorId", action,
                target_id AS "targetId", details, created_at AS "createdAt"
         FROM audit_log WHERE ($1::text IS NULL OR target_id = $1)
         ORDER BY id DESC LIMIT $2 OFFSET $3`,
        [targetId, limit, offset],
      );
      return rows.map((row) => ({ ...row, id: Number(row.id) }));
    },

    /**
     * Number of events of the audit log
     * @param {Object} options - { targetId, action }: only the events about this target, or of this action
     * @returns {Promise<number>} Events
     */
    async countAuditEvents({ targetId = null, action = null } = {}) {
      const { rows } = await pool.query(
        "SELECT count(*) AS count FROM audit_log WHERE ($1::text IS NULL OR target_id = $1) AND ($2::text IS NULL OR action = $2)",
        [targetId, action],
      );
      return Number(rows[0].count);
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
