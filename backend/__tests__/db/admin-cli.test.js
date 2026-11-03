/**
 * Admin command line script Tests
 *
 * npm run admin:promote -- [--demote] <username>
 * The checks that need no database. The ones with a real PostgreSQL are in
 * postgres.integration.test.js: two files cannot recreate the same tables at the same time.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = 'src/db/admin-promote.cli.js';

// An empty DATABASE_URL also stops dotenv from reading the one of backend/.env
const run = (args, databaseUrl = '') =>
  spawnSync(process.execPath, [script, ...args], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
    encoding: 'utf8',
    timeout: 30000,
  });

describe('admin script without a database', () => {
  test.each([
    ['no username', []],
    ['two usernames', ['anna', 'carlo']],
    ['an unknown option', ['--delete', 'anna']],
  ])('%s: exits with 2 and says how to use it', (_name, args) => {
    const result = run(args);

    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/Usage: npm run admin:promote/);
  });

  test('without DATABASE_URL it stops with 1 and says why', () => {
    const result = run(['anna']);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/DATABASE_URL is not set/);
  });
});
