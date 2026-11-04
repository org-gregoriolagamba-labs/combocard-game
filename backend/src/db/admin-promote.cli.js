/**
 * Command line entry point: npm run admin:promote -- [--demote] <username>
 *
 * Makes a registered user an admin (or, with --demote, a player again). It is the only way to
 * create the first admin: no route does it. It runs on the server, with the DATABASE_URL of
 * its .env, and it is also the way out if no admin is left. The last admin cannot be demoted.
 */

import config from "../config/index.js";
import { createPool } from "./index.js";
import { createPostgresStore } from "./store.js";
import { changeRoleByUsername } from "../services/admin.service.js";

const USAGE = "Usage: npm run admin:promote -- [--demote] <username>";
const PG_UNDEFINED_TABLE = "42P01";

const args = process.argv.slice(2);
const demote = args.includes("--demote");
const usernames = args.filter((arg) => arg !== "--demote");

if (usernames.length !== 1 || usernames[0].startsWith("-")) {
  console.error(USAGE);
  process.exit(2);
}

if (!config.databaseUrl) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const [username] = usernames;
const role = demote ? "player" : "admin";
const label = demote ? "a player" : "an admin";
const store = createPostgresStore(createPool());

try {
  const result = await changeRoleByUsername(store, { username, role, actor: { type: "system" } });
  console.log(result.changed ? `${username} is now ${label}.` : `${username} is already ${label}.`);
} catch (err) {
  const needsMigration = err.code === PG_UNDEFINED_TABLE;
  console.error(`❌ ${needsMigration ? "The database is not up to date: run npm run db:migrate first" : err.message}`);
  process.exitCode = 1;
} finally {
  await store.close();
}
