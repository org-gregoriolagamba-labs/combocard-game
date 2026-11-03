/**
 * PostgreSQL Integration Tests
 *
 * Run against a real database when TEST_DATABASE_URL is set, skipped otherwise.
 * WARNING: they drop and recreate the tables, so use a dedicated database.
 */

import pg from 'pg';
import { runMigrations } from '../../src/db/migrate.js';
import { createPostgresStore, INVALID_ROLE, LAST_ADMIN, USERNAME_TAKEN } from '../../src/db/store.js';

const url = process.env.TEST_DATABASE_URL;
const describeWithDb = url ? describe : describe.skip;

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
    await store.saveGame(game(), [{ playerId: 'p1', gameId: 'g1', type: 'game_entry', amount: -1 }]);
    await store.deleteGame('g1');

    await expect(store.findGame('g1')).resolves.toBeNull();
    const { rows } = await pool.query('SELECT game_id FROM credit_transactions');
    expect(rows).toEqual([{ game_id: null }]);
  });
});
