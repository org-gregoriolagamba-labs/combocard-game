/**
 * Admin command line script Tests
 *
 * npm run admin:promote -- [--demote] <username>
 * The checks that need no database always run; the others run against a real PostgreSQL
 * when TEST_DATABASE_URL is set (see postgres.integration.test.js: they recreate the tables).
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { runMigrations } from '../../src/db/migrate.js';
import { createPostgresStore } from '../../src/db/store.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = 'src/db/admin-promote.cli.js';
const url = process.env.TEST_DATABASE_URL;
const describeWithDb = url ? describe : describe.skip;

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

describeWithDb('admin script with PostgreSQL', () => {
  let pool;
  let store;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: url });
  });

  beforeEach(async () => {
    await pool.query(
      'DROP TABLE IF EXISTS audit_log, refresh_tokens, user_accounts, credit_transactions, games, players, schema_migrations',
    );
    await runMigrations(pool);
    store = createPostgresStore(pool);
    await store.createAccount(
      { id: 'p1', name: 'Anna', credits: 0, createdAt: '2026-01-01T00:00:00.000Z' },
      { username: 'Anna', usernameKey: 'anna', passwordHash: 'hash' },
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  test('an unknown user: exits with 1', () => {
    const result = run(['nobody'], url);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/not found/i);
  });

  test('promotes a user, and says so; again, it says it already is', async () => {
    const first = run(['Anna'], url);
    const second = run(['anna'], url);

    expect(first.status).toBe(0);
    expect(first.stdout).toMatch(/anna is now an admin/i);
    expect(second.status).toBe(0);
    expect(second.stdout).toMatch(/already an admin/i);
    await expect(store.findAccountById('p1')).resolves.toMatchObject({ role: 'admin' });
  });

  test('records the change as done by the system, once', async () => {
    run(['anna'], url);
    run(['anna'], url);

    await expect(store.listAuditEvents()).resolves.toEqual([
      expect.objectContaining({ action: 'role_changed', actorType: 'system', targetId: 'p1' }),
    ]);
  });

  test('--demote refuses to remove the last admin: exits with 1', async () => {
    run(['anna'], url);

    const result = run(['--demote', 'anna'], url);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/last admin/i);
    await expect(store.findAccountById('p1')).resolves.toMatchObject({ role: 'admin' });
  });

  test('prints no password and no hash', () => {
    const result = run(['anna'], url);

    expect(result.stdout + result.stderr).not.toMatch(/hash|password/i);
  });
});
