/**
 * PostgreSQL Integration Tests
 *
 * Run against a real database when TEST_DATABASE_URL is set, skipped otherwise.
 * WARNING: they drop and recreate the tables, so use a dedicated database.
 */

import pg from 'pg';
import { runMigrations } from '../../src/db/migrate.js';
import { createPostgresStore } from '../../src/db/store.js';

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
      'DROP TABLE IF EXISTS credit_transactions, games, players, schema_migrations',
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

  test('a deleted game disappears and its movements are kept', async () => {
    await store.createPlayer(player);
    await store.saveGame(game(), [{ playerId: 'p1', gameId: 'g1', type: 'game_entry', amount: -1 }]);
    await store.deleteGame('g1');

    await expect(store.findGame('g1')).resolves.toBeNull();
    const { rows } = await pool.query('SELECT game_id FROM credit_transactions');
    expect(rows).toEqual([{ game_id: null }]);
  });
});
