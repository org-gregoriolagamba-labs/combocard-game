/**
 * History of the credit movements and personal statistics of a player
 *
 * Run against a real database when TEST_DATABASE_URL is set, skipped otherwise. They work in a schema of
 * their own, so they cannot disturb (nor be disturbed by) the other suites that use the same database in
 * parallel. The memory store has no history: it answers null and the screen says so.
 */

import pg from 'pg';
import { runMigrations } from '../../src/db/migrate.js';
import { createMemoryStore, createPostgresStore } from '../../src/db/store.js';

const url = process.env.TEST_DATABASE_URL;
const describeWithDb = url ? describe : describe.skip;

const COLLEZIONI = ['tris', 'sequenza', 'scopa', 'napola', 'combocard_reale'];

const player = (id, name) => ({ id, name, credits: 0, createdAt: '2026-01-01T00:00:00.000Z' });
const game = (id, creator, players, overrides = {}) => ({
  id,
  status: 'finished',
  isPrivate: false,
  requiredCredits: 100,
  maxPlayers: 4,
  montepremi: 200,
  players: players.map((p, i) => ({ id: p.id ?? p, name: p.name ?? (i === 0 ? creator : 'Altro'), collezioni: p.collezioni ?? [], cartella: [[{ valore: 'A' }]], gettoni: 0 })),
  mazzo: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('the memory store has no history', () => {
  test('it answers null for the movements and the statistics', async () => {
    const store = createMemoryStore();

    await expect(store.listPlayerMovements('p1', { limit: 20, offset: 0 })).resolves.toBeNull();
    await expect(store.playerStats('p1')).resolves.toBeNull();
  });
});

describeWithDb('history and statistics, from the database', () => {
  let pool;
  let store;

  const SCHEMA = 'test_history';

  beforeAll(async () => {
    const admin = new pg.Pool({ connectionString: url });
    await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await admin.query(`CREATE SCHEMA ${SCHEMA}`);
    await admin.end();
    // Every table is created and read in the schema of this suite
    pool = new pg.Pool({ connectionString: url, options: `-c search_path=${SCHEMA}` });
  });

  beforeEach(async () => {
    await pool.query('DROP TABLE IF EXISTS audit_log, refresh_tokens, user_accounts, credit_transactions, games, players, schema_migrations');
    await runMigrations(pool);
    store = createPostgresStore(pool);
    await store.createPlayer(player('p1', 'Anna'));
    await store.createPlayer(player('p2', 'Bruno'));
    // Bruno has the credits for the fees, without any movement of purchase to count
    await pool.query("UPDATE players SET credits = 10000 WHERE id = 'p2'");
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await pool.end();
  });

  // Anna and Bruno play a game: each pays 100, Anna wins the tris and the reale and takes 150
  const playGame = async (id, { anna = ['tris', 'combocard_reale'], payout = 150, refund = false } = {}) => {
    const g = game(id, 'Anna', [{ id: 'p1', name: 'Anna', collezioni: anna }, { id: 'p2', name: 'Bruno' }]);
    await store.saveGame({ ...g, status: 'playing' }, [
      { playerId: 'p1', gameId: id, type: 'game_entry', amount: -100 },
      { playerId: 'p2', gameId: id, type: 'game_entry', amount: -100 },
    ]);
    if (refund) {
      await store.saveGame({ ...g, status: 'finished' }, [{ playerId: 'p1', gameId: id, type: 'game_refund', amount: 100 }]);
      return;
    }
    await store.saveGame(g, payout > 0 ? [{ playerId: 'p1', gameId: id, type: 'game_payout', amount: payout }] : []);
  };

  describe('the movements', () => {
    beforeEach(async () => {
      await store.recordPurchase('p1', 1000);
      await playGame('g1');
      await playGame('g2', { anna: [], payout: 0 });
    });

    test('are listed from the latest, with the type, the amount, the balance after and the game', async () => {
      const { items, total } = await store.listPlayerMovements('p1', { limit: 20, offset: 0 });

      expect(total).toBe(4);
      expect(items.map((m) => [m.tipo, m.importo, m.saldoDopo])).toEqual([
        ['game_entry', -100, 950],
        ['game_payout', 150, 1050],
        ['game_entry', -100, 900],
        ['purchase', 1000, 1000],
      ]);
      expect(items[0]).toMatchObject({ tipo: 'game_entry', importo: -100, partita: { id: 'g2', creatore: 'Anna' } });
      expect(items.at(-1)).toMatchObject({ tipo: 'purchase', importo: 1000, partita: null });
      expect(new Date(items[0].data).getTime()).not.toBeNaN();
    });

    test('are paged: a page of two, then the next', async () => {
      const first = await store.listPlayerMovements('p1', { limit: 2, offset: 0 });
      const second = await store.listPlayerMovements('p1', { limit: 2, offset: 2 });

      expect(first.items).toHaveLength(2);
      expect(second.items).toHaveLength(2);
      expect(first.total).toBe(4);
      expect(new Set([...first.items, ...second.items].map((m) => m.id)).size).toBe(4);
    });

    test('can be filtered by type', async () => {
      const { items, total } = await store.listPlayerMovements('p1', { limit: 20, offset: 0, type: 'game_entry' });

      expect(total).toBe(2);
      expect(items.every((m) => m.tipo === 'game_entry')).toBe(true);
    });

    test('can be filtered by period', async () => {
      await pool.query("UPDATE credit_transactions SET created_at = '2026-01-10T10:00:00Z' WHERE type = 'purchase'");

      const old = await store.listPlayerMovements('p1', { limit: 20, offset: 0, to: '2026-01-31T23:59:59Z' });
      const recent = await store.listPlayerMovements('p1', { limit: 20, offset: 0, from: '2026-02-01T00:00:00Z' });

      expect(old.items.map((m) => m.tipo)).toEqual(['purchase']);
      expect(recent.total).toBe(3);
    });

    test('are the own ones only: another player never sees them', async () => {
      const { items, total } = await store.listPlayerMovements('p2', { limit: 20, offset: 0 });

      expect(total).toBe(2);
      expect(items.every((m) => m.tipo === 'game_entry')).toBe(true);
    });

    test('an adjustment of the admin carries no reason', async () => {
      await store.adjustCredits('p1', 50, { actor: { type: 'player', id: 'admin' }, reason: 'nota interna riservata' });

      const { items } = await store.listPlayerMovements('p1', { limit: 20, offset: 0 });

      expect(items[0]).toMatchObject({ tipo: 'admin_adjustment', importo: 50 });
      expect(JSON.stringify(items)).not.toContain('nota interna riservata');
    });

    test('the balance after of the latest one is the balance of the player', async () => {
      const { items } = await store.listPlayerMovements('p1', { limit: 1, offset: 0 });
      const { rows } = await pool.query("SELECT credits FROM players WHERE id = 'p1'");

      expect(items[0].saldoDopo).toBe(Number(rows[0].credits));
    });

    test('a player with no movement has an empty list', async () => {
      await store.createPlayer(player('p3', 'Carla'));

      await expect(store.listPlayerMovements('p3', { limit: 20, offset: 0 })).resolves.toEqual({ items: [], total: 0 });
    });
  });

  describe('the statistics', () => {
    test('a new player has all zeros', async () => {
      await expect(store.playerStats('p1')).resolves.toEqual({
        partiteGiocate: 0,
        partiteConCollezione: 0,
        partiteVinte: 0,
        collezioniVinte: Object.fromEntries(COLLEZIONI.map((c) => [c, 0])),
        creditiSpesi: 0,
        creditiVinti: 0,
        saldoNetto: 0,
        incassoMassimo: 0,
      });
    });

    test('count the games played and won, the collections, the credits and the best prize', async () => {
      await store.recordPurchase('p1', 1000);
      await playGame('g1'); // tris and reale, 150
      await playGame('g2', { anna: ['scopa'], payout: 80 }); // one collection, 80
      await playGame('g3', { anna: [], payout: 0 }); // nothing

      const stats = await store.playerStats('p1');

      expect(stats).toEqual({
        partiteGiocate: 3,
        partiteConCollezione: 2,
        partiteVinte: 1,
        collezioniVinte: { tris: 1, sequenza: 0, scopa: 1, napola: 0, combocard_reale: 1 },
        creditiSpesi: 300,
        creditiVinti: 230,
        saldoNetto: -70,
        incassoMassimo: 150,
      });
    });

    test('a game cancelled by an admin and refunded is not a game played, and its fee is not spent', async () => {
      await store.recordPurchase('p1', 500);
      await playGame('g1', { refund: true });
      await playGame('g2');

      const stats = await store.playerStats('p1');

      expect(stats.partiteGiocate).toBe(1);
      expect(stats.creditiSpesi).toBe(100);
    });

    test('the credits bought or adjusted by an admin are not winnings nor expenses', async () => {
      await store.recordPurchase('p1', 500);
      await store.adjustCredits('p1', 70, { actor: { type: 'player', id: 'admin' }, reason: 'x' });

      const stats = await store.playerStats('p1');

      expect(stats.creditiSpesi).toBe(0);
      expect(stats.creditiVinti).toBe(0);
    });

    test('are the own ones: the other player of the same games has his own', async () => {
      await store.recordPurchase('p1', 500);
      await playGame('g1');

      const bruno = await store.playerStats('p2');

      expect(bruno).toMatchObject({ partiteGiocate: 1, partiteConCollezione: 0, partiteVinte: 0, creditiVinti: 0, creditiSpesi: 100 });
    });
  });
});
