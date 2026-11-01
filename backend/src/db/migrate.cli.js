/**
 * Command line entry point: npm run db:migrate
 */

import config from "../config/index.js";
import { createPool } from "./index.js";
import { runMigrations } from "./migrate.js";

if (!config.databaseUrl) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const pool = createPool();

try {
  const applied = await runMigrations(pool);
  console.log(applied.length > 0 ? `Applied: ${applied.join(", ")}` : "Nothing to apply");
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
