/**
 * Database Migrations
 *
 * Applies the SQL files in db/migrations in name order, each in its own
 * transaction. An advisory lock keeps concurrent server starts from racing.
 */

import { readdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MIGRATIONS_DIR = path.resolve(__dirname, "../../db/migrations");
const MIGRATION_LOCK_ID = 7203114;

/**
 * Apply all pending migrations
 * @param {Pool} pool - pg connection pool
 * @param {string} migrationsDir - Directory containing the .sql files
 * @returns {Promise<string[]>} Names of the migrations applied by this call
 */
export async function runMigrations(pool, migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const client = await pool.connect();
  const applied = [];

  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const done = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (done.has(file)) {
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        applied.push(file);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${err.message}`, { cause: err });
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }

  return applied;
}
