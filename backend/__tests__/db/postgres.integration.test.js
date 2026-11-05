/**
 * PostgreSQL Integration Tests
 *
 * Run against a real database when TEST_DATABASE_URL is set, skipped otherwise.
 * WARNING: they drop and recreate the tables, so use a dedicated database.
 */

import { spawnSync } from 'child_process';
import { copyFile, mkdtemp, readdir, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { runMigrations } from '../../src/db/migrate.js';
import { createPostgresStore, INSUFFICIENT_CREDITS, INVALID_ROLE, LAST_ADMIN, USERNAME_TAKEN } from '../../src/db/store.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = process.env.TEST_DATABASE_URL;
const describeWithDb = url ? describe : describe.skip;

// npm run admin:promote, as the operator runs it, against the test database
const run = (args, databaseUrl) =>
  spawnSync(process.execPath, ['src/db/admin-promote.cli.js', ...args], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
    encoding: 'utf8',
    timeout: 30000,
  });

const game = (overrides = {}) => ({
  id: 'g1',
  status: 'waiting',
  isPrivate: false,
  requiredCredits: 100,
  maxPlayers: 2,
  montepremi: 0,
  players: [{ id: 'p1', name: 'Anna', cartella: [[{ valore: 'A' }]], gettoni: 0 }],
  mazzo: [{ valore: '7', seme: 'coppe' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const player = { id: 'p1', name: 'Anna', credits: 0, createdAt: '2026-01-01T00:00:00.000Z' };

describeWithDb('PostgreSQL store', () => {
  let pool;
  let store;

  const balance = async (id = 'p1') => {
    const { rows } = await pool.query(
      `SELECT p.credits, COALESCE(SUM(t.amount), 0) AS ledger
       FROM players p LEFT JOIN credit_transactions t ON t.player_id = p.id
       WHERE p.id = $1 GROUP BY p.credits`,
      [id],
    );
    return { credits: Number(rows[0].credits), ledger: Number(rows[0].ledger) };
  };

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: url });
  });

  beforeEach(async () => {
    await pool.query(
      'DROP TABLE IF EXISTS audit_log, refresh_tokens, user_accounts, credit_transactions, games, players, schema_migrations',
    );
    await runMigrations(pool);
    store = createPostgresStore(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  test('migrations are applied once', async () => {
    await expect(runMigrations(pool)).resolves.toEqual([]);
  });

  test('players and purchases survive a reload', async () => {
    await store.createPlayer(player);
    await store.recordPurchase('p1', 500);
    await store.recordPurchase('p1', 250);

    const { players } = await createPostgresStore(pool).loadState();

    expect(players.p1).toMatchObject({ name: 'Anna', credits: 750 });
    await expect(balance()).resolves.toEqual({ credits: 750, ledger: 750 });
  });

  test('concurrent purchases are all counted', async () => {
    await store.createPlayer(player);
    await Promise.all(Array.from({ length: 20 }, () => store.recordPurchase('p1', 10)));
    await expect(balance()).resolves.toEqual({ credits: 200, ledger: 200 });
  });

  test('a purchase for an unknown player changes nothing', async () => {
    await expect(store.recordPurchase('ghost', 10)).rejects.toThrow('unknown player');
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM credit_transactions');
    expect(rows[0].n).toBe(0);
  });

  test('an active game is restored with its full state', async () => {
    await store.createPlayer(player);
    await store.saveGame(game({ status: 'playing' }));

    const { games, players } = await createPostgresStore(pool).loadState();

    expect(games.g1).toEqual(game({ status: 'playing' }));
    expect(players.p1.currentGameId).toBe('g1');
  });

  test('game movements are stored with the snapshot and keep the balance consistent', async () => {
    await store.createPlayer(player);
    await store.recordPurchase('p1', 500);

    await store.saveGame(game({ status: 'playing' }), [
      { playerId: 'p1', gameId: 'g1', type: 'game_entry', amount: -100 },
    ]);
    await store.saveGame(game({ status: 'finished' }), [
      { playerId: 'p1', gameId: 'g1', type: 'game_payout', amount: 30 },
    ]);

    await expect(balance()).resolves.toEqual({ credits: 430, ledger: 430 });
    const { rows } = await pool.query(
      'SELECT type, balance_after FROM credit_transactions ORDER BY id',
    );
    expect(rows.map((r) => [r.type, Number(r.balance_after)])).toEqual([
      ['purchase', 500],
      ['game_entry', 400],
      ['game_payout', 430],
    ]);
  });

  test('finished games stay readable but are not restored into memory', async () => {
    await store.createPlayer(player);
    await store.saveGame(game({ status: 'finished' }));

    const { games, players } = await createPostgresStore(pool).loadState();

    expect(games.g1).toBeUndefined();
    expect(players.p1.currentGameId).toBeNull();
    await expect(store.findGame('g1')).resolves.toMatchObject({ status: 'finished' });
  });

  describe('accounts', () => {
    const account = { username: 'Anna', usernameKey: 'anna', passwordHash: 'hash' };

    test('are stored together with the player', async () => {
      await store.createAccount(player, account);

      await expect(store.findAccountByUsernameKey('anna')).resolves.toEqual({
        playerId: 'p1',
        passwordHash: 'hash',
        role: 'player',
      });
      await expect(store.findAccountById('p1')).resolves.toEqual({ playerId: 'p1', role: 'player' });
      const { players } = await createPostgresStore(pool).loadState();
      expect(players.p1.name).toBe('Anna');
    });

    test('with a taken username leave no player behind', async () => {
      await store.createAccount(player, account);

      await expect(store.createAccount({ ...player, id: 'p2' }, account))
        .rejects.toMatchObject({ code: USERNAME_TAKEN });

      const { rows } = await pool.query('SELECT count(*)::int AS n FROM players');
      expect(rows[0].n).toBe(1);
    });

    test('are not required for existing players with duplicate names', async () => {
      await store.createPlayer(player);
      await store.createPlayer({ ...player, id: 'p2' });

      await expect(store.createAccount({ ...player, id: 'p3' }, account)).resolves.toBeUndefined();
    });
  });

  describe('admin: accounts, credits and audit log', () => {
    const system = { type: 'system' };
    const makeAccount = (id, username) =>
      store.createAccount({ ...player, id, name: username }, { username, usernameKey: username.toLowerCase(), passwordHash: 'hash' });

    beforeEach(async () => {
      await makeAccount('p1', 'Anna');
      await makeAccount('p2', 'Carlo Rossi');
      await makeAccount('p3', 'Dario');
      await makeAccount('p4', 'Anna Maria');
      await store.setAccountRole('p3', 'admin', { actor: system });
      await store.recordPurchase('p1', 100);
    });

    test('getAccount gives the account as the admin area shows it, without the password hash, or null', async () => {
      await expect(store.getAccount('p2')).resolves.toEqual({
        playerId: 'p2', username: 'Carlo Rossi', role: 'player', createdAt: expect.any(Date),
      });
      await expect(store.getAccount('ghost')).resolves.toBeNull();
    });

    describe('listAccounts', () => {
      test('lists by name with the total, and never the password hash', async () => {
        const { items, total } = await store.listAccounts();

        expect(total).toBe(4);
        expect(items.map((a) => a.username)).toEqual(['Anna', 'Anna Maria', 'Carlo Rossi', 'Dario']);
        expect(items[0]).toEqual({ playerId: 'p1', username: 'Anna', role: 'player', createdAt: expect.any(Date) });
        expect(JSON.stringify(items)).not.toMatch(/hash/);
      });

      test('searches a part of the name without caring about the case, and filters by role', async () => {
        await expect(store.listAccounts({ q: 'ANNA' })).resolves.toMatchObject({ total: 2 });
        await expect(store.listAccounts({ role: 'admin' })).resolves.toMatchObject({ total: 1, items: [{ playerId: 'p3' }] });
      });

      test('pages, with the total of the whole result', async () => {
        const second = await store.listAccounts({ limit: 2, offset: 2 });

        expect(second.items.map((a) => a.playerId)).toEqual(['p2', 'p3']);
        expect(second.total).toBe(4);
      });

      test('the characters of a pattern are searched as they are, not as a pattern', async () => {
        await store.setAccountUsername('p2', { username: '100% Carlo', usernameKey: '100% carlo' }, { actor: system });

        await expect(store.listAccounts({ q: '%' })).resolves.toMatchObject({ total: 1, items: [{ playerId: 'p2' }] });
        await expect(store.listAccounts({ q: '_' })).resolves.toMatchObject({ total: 0 });
        await expect(store.listAccounts({ q: "x' OR '1'='1" })).resolves.toMatchObject({ total: 0 });
      });
    });

    describe('setAccountUsername', () => {
      const rename = (playerId, username) =>
        store.setAccountUsername(playerId, { username, usernameKey: username.toLowerCase() }, { actor: system });

      test('renames the account and the player together, and the new name is the one of the login', async () => {
        await expect(rename('p2', 'Carlo Bianchi'))
          .resolves.toEqual({ playerId: 'p2', username: 'Carlo Bianchi', previousUsername: 'Carlo Rossi', changed: true });

        await expect(store.findAccountByUsernameKey('carlo bianchi')).resolves.toMatchObject({ playerId: 'p2' });
        await expect(store.findAccountByUsernameKey('carlo rossi')).resolves.toBeNull();
        const { players } = await createPostgresStore(pool).loadState();
        expect(players.p2.name).toBe('Carlo Bianchi');
      });

      test('a name in use by another account is refused, and neither the account nor the player changes', async () => {
        await expect(rename('p2', 'ANNA')).rejects.toMatchObject({ code: USERNAME_TAKEN });

        await expect(store.findAccountByUsernameKey('carlo rossi')).resolves.toMatchObject({ playerId: 'p2' });
        const { players } = await createPostgresStore(pool).loadState();
        expect(players.p2.name).toBe('Carlo Rossi');
        const events = await store.listAuditEvents({ targetId: 'p2' });
        expect(events).toEqual([]);
      });

      test('the same name with other capital letters is a change of the account itself; the same again is not', async () => {
        await expect(rename('p1', 'ANNA')).resolves.toMatchObject({ changed: true });
        await expect(rename('p1', 'ANNA')).resolves.toMatchObject({ changed: false });
        await expect(store.listAuditEvents({ targetId: 'p1' })).resolves.toHaveLength(1);
      });

      test('an unknown player gives null; without who does it, it refuses', async () => {
        await expect(rename('ghost', 'Nobody')).resolves.toBeNull();
        await expect(store.setAccountUsername('p1', { username: 'Zeta', usernameKey: 'zeta' })).rejects.toThrow();
      });

      test('two renames to the same name at the same time: one wins, the other is told it is taken', async () => {
        const results = await Promise.allSettled([rename('p1', 'Gemello'), rename('p2', 'GEMELLO')]);

        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((r) => r.status === 'rejected').map((r) => r.reason.code)).toEqual([USERNAME_TAKEN]);
      });
    });

    describe('adjustCredits', () => {
      test('adds credits: a movement of its own kind, the balance, and the audit row, together', async () => {
        await expect(store.adjustCredits('p1', 50, { actor: system, reason: 'regalo' }))
          .resolves.toEqual({ playerId: 'p1', amount: 50 });

        await expect(balance('p1')).resolves.toEqual({ credits: 150, ledger: 150 });
        const { rows } = await pool.query("SELECT type, amount, balance_after FROM credit_transactions WHERE type = 'admin_adjustment'");
        expect(rows.map((r) => [r.type, Number(r.amount), Number(r.balance_after)])).toEqual([['admin_adjustment', 50, 150]]);
        const [event] = await store.listAuditEvents({ targetId: 'p1' });
        expect(event).toMatchObject({ action: 'credits_adjusted', actorType: 'system', details: { amount: 50, reason: 'regalo' } });
      });

      test('takes credits away, down to zero', async () => {
        await store.adjustCredits('p1', -100, { actor: system, reason: 'azzeramento' });

        await expect(balance('p1')).resolves.toEqual({ credits: 0, ledger: 0 });
      });

      test('more than the balance is refused, and nothing changes: no movement, no audit row', async () => {
        await expect(store.adjustCredits('p1', -101, { actor: system, reason: 'troppo' }))
          .rejects.toMatchObject({ code: INSUFFICIENT_CREDITS });

        await expect(balance('p1')).resolves.toEqual({ credits: 100, ledger: 100 });
        await expect(store.listAuditEvents({ targetId: 'p1' })).resolves.toEqual([]);
      });

      test('an unknown player gives null; no reason, no actor or an amount that is not whole refuse', async () => {
        await expect(store.adjustCredits('ghost', 10, { actor: system, reason: 'x' })).resolves.toBeNull();
        await expect(store.adjustCredits('p1', 10, { actor: system })).rejects.toThrow();
        await expect(store.adjustCredits('p1', 10, { reason: 'x' })).rejects.toThrow();
        await expect(store.adjustCredits('p1', 0.5, { actor: system, reason: 'x' })).rejects.toThrow();
        await expect(balance('p1')).resolves.toEqual({ credits: 100, ledger: 100 });
      });

      test('the type of movement is allowed by the database, and an unknown one still is not', async () => {
        await expect(pool.query("INSERT INTO credit_transactions (player_id, type, amount, balance_after) VALUES ('p1', 'admin_adjustment', 1, 101)"))
          .resolves.toBeDefined();
        await expect(pool.query("INSERT INTO credit_transactions (player_id, type, amount, balance_after) VALUES ('p1', 'gift', 1, 101)"))
          .rejects.toMatchObject({ code: '23514' });
      });
    });

    describe('cancelGame and gameStats', () => {
      const playing = (overrides = {}) =>
        game({ id: 'g1', status: 'playing', requiredCredits: 100, montepremi: 100, players: [{ id: 'p1', name: 'Anna', gettoni: 0 }], ...overrides });

      beforeEach(async () => {
        // p1 has 100: the entry fee of the game takes them to zero
        await store.saveGame(playing(), [{ playerId: 'p1', gameId: 'g1', type: 'game_entry', amount: -100 }]);
      });

      test('removes the game, gives the fee back and writes the audit row, in one transaction', async () => {
        await store.cancelGame(playing(), [{ playerId: 'p1', amount: 100 }], { actor: { type: 'player', id: 'p3' }, reason: 'bloccata' });

        await expect(balance('p1')).resolves.toEqual({ credits: 100, ledger: 100 });
        const { rows } = await pool.query("SELECT type, amount, game_id FROM credit_transactions WHERE type = 'game_refund'");
        expect(rows.map((r) => [r.type, Number(r.amount)])).toEqual([['game_refund', 100]]);
        await expect(store.findGame('g1')).resolves.toBeNull();
        const [event] = await store.listAuditEvents({ targetId: 'g1' });
        expect(event).toMatchObject({
          action: 'game_cancelled',
          actorId: 'p3',
          details: { reason: 'bloccata', previousStatus: 'playing', refunds: [{ playerId: 'p1', amount: 100 }] },
        });
      });

      test('a refund that cannot be applied changes nothing: the game stays, no audit row', async () => {
        await expect(store.cancelGame(playing(), [{ playerId: 'ghost', amount: 100 }], { actor: system, reason: 'x' })).rejects.toThrow();

        await expect(store.findGame('g1')).resolves.not.toBeNull();
        await expect(balance('p1')).resolves.toEqual({ credits: 0, ledger: 0 });
        await expect(store.listAuditEvents({ targetId: 'g1' })).resolves.toEqual([]);
      });

      test('the actor and the reason are needed', async () => {
        await expect(store.cancelGame(playing(), [], { reason: 'x' })).rejects.toThrow();
        await expect(store.cancelGame(playing(), [], { actor: system })).rejects.toThrow();
        await expect(store.findGame('g1')).resolves.not.toBeNull();
      });

      test('the type of movement is allowed by the database', async () => {
        await expect(pool.query("INSERT INTO credit_transactions (player_id, type, amount, balance_after) VALUES ('p1', 'game_refund', 1, 1)"))
          .resolves.toBeDefined();
      });

      test('gameStats counts the finished games and their prizes, from the database', async () => {
        await store.saveGame(game({ id: 'f1', status: 'finished', montepremi: 300 }));
        await store.saveGame(game({ id: 'f2', status: 'finished', montepremi: 500 }));

        await expect(store.gameStats()).resolves.toEqual({ finished: 2, prizesDistributed: 800 });
      });

      test('countAuditEvents can count one action', async () => {
        await store.cancelGame(playing(), [{ playerId: 'p1', amount: 100 }], { actor: system, reason: 'x' });

        await expect(store.countAuditEvents({ action: 'game_cancelled' })).resolves.toBe(1);
        await expect(store.countAuditEvents({ action: 'role_changed' })).resolves.toBe(1); // the promotion of p3
      });
    });

    test('the audit log by target and by page, with the total', async () => {
      await store.adjustCredits('p1', 10, { actor: system, reason: 'uno' });
      await store.adjustCredits('p2', 20, { actor: system, reason: 'due' });
      await store.adjustCredits('p1', 30, { actor: system, reason: 'tre' });

      expect((await store.listAuditEvents({ targetId: 'p1' })).map((e) => e.details.reason)).toEqual(['tre', 'uno']);
      await expect(store.countAuditEvents({ targetId: 'p1' })).resolves.toBe(2);
      expect((await store.listAuditEvents({ limit: 2, offset: 1 })).map((e) => e.details.reason)).toEqual(['due', 'uno']);
      await expect(store.countAuditEvents()).resolves.toBe(4); // plus the promotion of p3
    });
  });

  describe('credits never go below zero', () => {
    const constraint = async () => {
      const { rows } = await pool.query(
        "SELECT convalidated FROM pg_constraint WHERE conname = 'players_credits_non_negative'",
      );
      return rows[0]?.convalidated;
    };

    test('a movement that would leave a negative balance is refused, with the whole write', async () => {
      await store.createPlayer(player);
      await store.recordPurchase('p1', 100);

      await expect(store.saveGame(game({ status: 'playing' }), [
        { playerId: 'p1', gameId: 'g1', type: 'game_entry', amount: -101 },
      ])).rejects.toMatchObject({ code: INSUFFICIENT_CREDITS });

      await expect(balance()).resolves.toEqual({ credits: 100, ledger: 100 });
      await expect(store.findGame('g1')).resolves.toBeNull();
    });

    test('spending exactly what is left is allowed', async () => {
      await store.createPlayer(player);
      await store.recordPurchase('p1', 100);

      await store.saveGame(game({ status: 'playing' }), [
        { playerId: 'p1', gameId: 'g1', type: 'game_entry', amount: -100 },
      ]);

      await expect(balance()).resolves.toEqual({ credits: 0, ledger: 0 });
    });

    test('a movement for a player that does not exist is still an error about the player', async () => {
      await expect(store.saveGame(game(), [
        { playerId: 'ghost', gameId: 'g1', type: 'game_entry', amount: -10 },
      ])).rejects.toThrow(/unknown player/);
    });

    test('the database itself refuses a negative balance', async () => {
      await store.createPlayer(player);

      await expect(pool.query("UPDATE players SET credits = -1 WHERE id = 'p1'")).rejects.toMatchObject({ code: '23514' });
      await expect(pool.query("INSERT INTO players (id, name, credits) VALUES ('p9', 'Nina', -5)")).rejects.toMatchObject({ code: '23514' });
    });

    test('on a database without negative balances the constraint is validated', async () => {
      await expect(constraint()).resolves.toBe(true);
    });

    test('a database that already has a negative balance still migrates: the old row stays, the rule applies from now on', async () => {
      const upTo004 = await mkdtemp(path.join(os.tmpdir(), 'migrations-'));
      try {
        const migrations = path.join(backendDir, 'db/migrations');
        for (const file of (await readdir(migrations)).filter((f) => f < '005')) {
          await copyFile(path.join(migrations, file), path.join(upTo004, file));
        }
        await pool.query(
          'DROP TABLE IF EXISTS audit_log, refresh_tokens, user_accounts, credit_transactions, games, players, schema_migrations',
        );
        await runMigrations(pool, upTo004);
        await pool.query("INSERT INTO players (id, name, credits) VALUES ('debtor', 'Debitore', -50), ('ok', 'Anna', 100)");

        // the migrations after the 004 are applied now; the 005 is the one that matters here
        await expect(runMigrations(pool)).resolves.toEqual(expect.arrayContaining(['005_credits_non_negative.sql']));

        await expect(constraint()).resolves.toBe(false);
        const { rows } = await pool.query("SELECT credits FROM players WHERE id = 'debtor'");
        expect(Number(rows[0].credits)).toBe(-50);
        await expect(pool.query("UPDATE players SET credits = -1 WHERE id = 'ok'")).rejects.toMatchObject({ code: '23514' });
      } finally {
        await rm(upTo004, { recursive: true, force: true });
      }
    });
  });

  describe('roles and audit log', () => {
    const system = { type: 'system' };
    const makeAccount = (id) =>
      store.createAccount({ ...player, id, name: id }, { username: id, usernameKey: id, passwordHash: 'hash' });

    beforeEach(async () => {
      await makeAccount('p1');
      await makeAccount('p2');
      await makeAccount('p3');
    });

    test('existing accounts stay players, and the database refuses a role that does not exist', async () => {
      await expect(store.countAdmins()).resolves.toBe(0);
      await expect(pool.query("UPDATE user_accounts SET role = 'root' WHERE player_id = 'p1'"))
        .rejects.toMatchObject({ code: '23514' });
    });

    test('promotes and demotes, and the new role is the one found at the next request', async () => {
      await expect(store.setAccountRole('p1', 'admin', { actor: system }))
        .resolves.toEqual({ playerId: 'p1', role: 'admin', previousRole: 'player', changed: true });
      await expect(store.findAccountById('p1')).resolves.toEqual({ playerId: 'p1', role: 'admin' });
      await expect(store.findAccountByUsernameKey('p1')).resolves.toMatchObject({ role: 'admin' });

      await store.setAccountRole('p2', 'admin', { actor: system });
      await expect(store.setAccountRole('p1', 'player', { actor: system })).resolves.toMatchObject({ changed: true });
      await expect(store.findAccountById('p1')).resolves.toEqual({ playerId: 'p1', role: 'player' });
    });

    test('an unknown player gives null, a role that does not exist is refused before the database', async () => {
      await expect(store.setAccountRole('ghost', 'admin', { actor: system })).resolves.toBeNull();
      await expect(store.setAccountRole('p1', 'root', { actor: system })).rejects.toMatchObject({ code: INVALID_ROLE });
      await expect(store.setAccountRole('p1', 'admin')).rejects.toThrow();
      await expect(store.countAdmins()).resolves.toBe(0);
    });

    test('the only admin cannot be demoted, and the refusal leaves no trace', async () => {
      await store.setAccountRole('p1', 'admin', { actor: system });

      await expect(store.setAccountRole('p1', 'player', { actor: system })).rejects.toMatchObject({ code: LAST_ADMIN });

      await expect(store.countAdmins()).resolves.toBe(1);
      await expect(store.listAuditEvents()).resolves.toHaveLength(1);
    });

    test('two demotions at the same time of the only two admins leave one', async () => {
      await store.setAccountRole('p1', 'admin', { actor: system });
      await store.setAccountRole('p2', 'admin', { actor: system });

      const results = await Promise.allSettled([
        store.setAccountRole('p1', 'player', { actor: system }),
        store.setAccountRole('p2', 'player', { actor: system }),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected').map((r) => r.reason.code)).toEqual([LAST_ADMIN]);
      await expect(store.countAdmins()).resolves.toBe(1);
    });

    test('the change and its audit row are one transaction, and the log keeps who did what to whom', async () => {
      await store.setAccountRole('p1', 'admin', { actor: system });
      await store.setAccountRole('p2', 'admin', { actor: { type: 'player', id: 'p1' } });
      await store.setAccountRole('p2', 'admin', { actor: { type: 'player', id: 'p1' } });

      const events = await store.listAuditEvents();

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        action: 'role_changed',
        actorType: 'player',
        actorId: 'p1',
        targetId: 'p2',
        details: { from: 'player', to: 'admin' },
      });
      expect(events[0].createdAt).toBeInstanceOf(Date);
      expect(events[1]).toMatchObject({ actorType: 'system', actorId: null, targetId: 'p1' });
      await expect(store.listAuditEvents({ limit: 1 })).resolves.toHaveLength(1);
    });

    test('the audit log refuses an actor type that does not exist', async () => {
      await expect(pool.query("INSERT INTO audit_log (actor_type, action) VALUES ('robot', 'x')"))
        .rejects.toMatchObject({ code: '23514' });
    });
  });

  describe('admin script', () => {
    beforeEach(async () => {
      await store.createAccount(
        { id: 'p1', name: 'Anna', credits: 0, createdAt: '2026-01-01T00:00:00.000Z' },
        { username: 'Anna', usernameKey: 'anna', passwordHash: 'hash' },
      );
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

  describe('refresh tokens', () => {
    const inOneHour = () => new Date(Date.now() + 3600 * 1000);
    const rotate = (from, to, graceSeconds = 10) =>
      store.rotateRefreshToken(from, { tokenHash: to, expiresAt: inOneHour(), graceSeconds });

    beforeEach(async () => {
      await store.createAccount(player, { username: 'Anna', usernameKey: 'anna', passwordHash: 'hash' });
      await store.createRefreshToken({ tokenHash: 't1', familyId: 'f1', playerId: 'p1', expiresAt: inOneHour() });
    });

    test('rotate and return the player', async () => {
      await expect(rotate('t1', 't2')).resolves.toBe('p1');
      await expect(rotate('t2', 't3')).resolves.toBe('p1');
    });

    test('are rejected when unknown', async () => {
      await expect(rotate('nope', 't2')).resolves.toBeNull();
    });

    test('are rejected when expired, and removed at the next login', async () => {
      await store.createRefreshToken({
        tokenHash: 'old', familyId: 'f2', playerId: 'p1', expiresAt: new Date(Date.now() - 1000),
      });
      await expect(rotate('old', 't2')).resolves.toBeNull();

      await store.createRefreshToken({ tokenHash: 't3', familyId: 'f3', playerId: 'p1', expiresAt: inOneHour() });
      const { rows } = await pool.query("SELECT 1 FROM refresh_tokens WHERE token_hash = 'old'");
      expect(rows).toHaveLength(0);
    });

    test('accept concurrent renewals of the same token in the grace period', async () => {
      const results = await Promise.all([rotate('t1', 'a'), rotate('t1', 'b'), rotate('t1', 'c')]);
      expect(results).toEqual(['p1', 'p1', 'p1']);
    });

    test('reused after the grace period revoke the whole family', async () => {
      await rotate('t1', 't2');

      await expect(rotate('t1', 't3', 0)).resolves.toBeNull();

      await expect(rotate('t2', 't4')).resolves.toBeNull();
    });

    test('revoked at logout stop the whole family, but not other sessions', async () => {
      await store.createRefreshToken({ tokenHash: 'other', familyId: 'f2', playerId: 'p1', expiresAt: inOneHour() });
      await rotate('t1', 't2');

      await store.revokeRefreshToken('t1');

      await expect(rotate('t2', 't3')).resolves.toBeNull();
      await expect(rotate('other', 'other2')).resolves.toBe('p1');
    });

    test('are stored only with the given hash', async () => {
      const { rows } = await pool.query('SELECT token_hash FROM refresh_tokens');
      expect(rows).toEqual([{ token_hash: 't1' }]);
    });
  });

  test('a deleted game disappears and its movements are kept', async () => {
    await store.createPlayer(player);
    await store.recordPurchase('p1', 10);
    await store.saveGame(game(), [{ playerId: 'p1', gameId: 'g1', type: 'game_entry', amount: -1 }]);
    await store.deleteGame('g1');

    await expect(store.findGame('g1')).resolves.toBeNull();
    const { rows } = await pool.query("SELECT game_id FROM credit_transactions WHERE type = 'game_entry'");
    expect(rows).toEqual([{ game_id: null }]);
  });
});
