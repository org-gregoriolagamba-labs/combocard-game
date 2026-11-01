/**
 * Database Bootstrap
 *
 * Connects to PostgreSQL when DATABASE_URL is set, applies pending migrations
 * and restores the saved state. Without DATABASE_URL the server runs in memory.
 */

import pg from "pg";
import config from "../config/index.js";
import { runMigrations } from "./migrate.js";
import { createMemoryStore, createPostgresStore } from "./store.js";

/**
 * Create the connection pool from the configuration
 * @returns {Pool} pg connection pool
 */
export function createPool() {
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolMax,
  });

  // Without a listener, an idle client error would crash the process.
  pool.on("error", (err) => {
    console.error(`❌ Idle database client error: ${err.message}`);
  });

  return pool;
}

/**
 * Prepare the store and load the saved data into gameState
 * @param {Object} gameState - Global game state
 * @returns {Promise<Object>} Store
 */
export async function initializePersistence(gameState) {
  if (!config.databaseUrl) {
    console.warn("⚠️ DATABASE_URL not set: data is kept in memory and lost on restart");
    return createMemoryStore();
  }

  const pool = createPool();

  try {
    const applied = await runMigrations(pool);
    if (applied.length > 0) {
      console.log(`🗄️ Migrations applied: ${applied.join(", ")}`);
    }

    const store = createPostgresStore(pool);
    const { players, games } = await store.loadState();
    Object.assign(gameState.players, players);
    Object.assign(gameState.games, games);

    console.log(
      `🗄️ Restored ${Object.keys(players).length} players and ${Object.keys(games).length} active games`,
    );
    return store;
  } catch (err) {
    await pool.end().catch(() => {});
    throw err;
  }
}
