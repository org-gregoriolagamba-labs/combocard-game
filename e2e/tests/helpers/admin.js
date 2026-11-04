/**
 * Admin helpers for the API tests
 *
 * An admin cannot be made through the API: the script of the operator does it, on the database of
 * the server under test. These helpers need E2E_DATABASE_URL, the same database the backend uses
 * (a PostgreSQL: with the in-memory server nobody can be made admin).
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerPlayer } from './auth.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../backend');

/** The database of the server under test, or undefined when the server keeps its data in memory */
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL;

/**
 * Make a registered player an admin, with the script of the operator
 * @param {string} username - Username of the player
 */
export function promoteToAdmin(username) {
  const result = spawnSync('npm', ['--prefix', backendDir, 'run', '--silent', 'admin:promote', '--', username], {
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    encoding: 'utf8',
    timeout: 60000,
  });
  if (result.status !== 0) {
    throw new Error(`admin:promote failed (${result.status}): ${result.stderr || result.stdout}`);
  }
}

/**
 * Register a player and make them an admin
 * @param {APIRequestContext} request - Playwright request context
 * @param {string} apiUrl - Backend URL
 * @param {string} base - Readable prefix of the username
 * @returns {Promise<Object>} Player, with `token` and ready-to-use `headers`
 */
export async function registerAdmin(request, apiUrl, base = 'Admin') {
  const player = await registerPlayer(request, apiUrl, base);
  promoteToAdmin(player.name);
  return player;
}
