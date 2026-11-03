/**
 * Persistence Store Tests
 *
 * Use a fake pool to check transactions, write ordering and retries.
 * postgres.integration.test.js covers the real SQL.
 */

import { jest } from '@jest/globals';
import { createMemoryStore, createPostgresStore, decideRotation } from '../../src/db/store.js';

function createFakePool({ onQuery = () => {} } = {}) {
  const log = [];
  const client = {
    query: async (sql, params) => {
      log.push({ sql: sql.trim(), params });
      await onQuery(sql, params);
      return { rows: sql.includes('RETURNING credits') ? [{ credits: '100' }] : [] };
    },
    release: jest.fn(),
  };
  return {
    log,
    client,
    connect: jest.fn(async () => client),
    query: jest.fn(async () => ({ rows: [] })),
    end: jest.fn(async () => {}),
  };
}

const statements = (pool) => pool.log.map((q) => q.sql.split(/\s+/).slice(0, 2).join(' '));

const game = (status = 'waiting') => ({
  id: 'g1',
  status,
  isPrivate: false,
  requiredCredits: 100,
  maxPlayers: 2,
  montepremi: 0,
  players: [],
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('createPostgresStore', () => {
  test('recordPurchase updates the balance and the ledger in one transaction', async () => {
    const pool = createFakePool();
    await createPostgresStore(pool).recordPurchase('p1', 100);

    expect(statements(pool)).toEqual(['BEGIN', 'UPDATE players', 'INSERT INTO', 'COMMIT']);
    expect(pool.log[1].params).toEqual(['p1', 100]);
    expect(pool.log[2].params).toEqual(['p1', null, 'purchase', 100, '100']);
    expect(pool.client.release).toHaveBeenCalledTimes(1);
  });

  test('a failed purchase rolls back, releases the client and rejects', async () => {
    const pool = createFakePool({
      onQuery: (sql) => {
        if (sql.startsWith('INSERT INTO credit_transactions')) {
          throw new Error('boom');
        }
      },
    });

    await expect(createPostgresStore(pool).recordPurchase('p1', 100)).rejects.toThrow('boom');
    expect(statements(pool)).toContain('ROLLBACK');
    expect(statements(pool)).not.toContain('COMMIT');
    expect(pool.client.release).toHaveBeenCalledTimes(1);
  });

  test('createPlayer records a movement only for a non-zero starting balance', async () => {
    const pool = createFakePool();
    const store = createPostgresStore(pool);
    const base = { id: 'p1', name: 'A', createdAt: '2026-01-01T00:00:00.000Z' };

    await store.createPlayer({ ...base, credits: 0 });
    expect(statements(pool)).toEqual(['BEGIN', 'INSERT INTO', 'COMMIT']);

    pool.log.length = 0;
    await store.createPlayer({ ...base, credits: 50 });
    expect(pool.log[3].params).toEqual(['p1', null, 'initial', 50, '100']);
  });

  test('saveGame serializes the game when called, not when written', async () => {
    const pool = createFakePool();
    const g = game();

    const saved = createPostgresStore(pool).saveGame(g);
    g.status = 'playing';
    await saved;

    const insert = pool.log.find((q) => q.sql.startsWith('INSERT INTO games'));
    expect(insert.params[1]).toBe('waiting');
    expect(JSON.parse(insert.params[6]).status).toBe('waiting');
  });

  test('recordRulesAccepted saves the date of the confirmation with the player', async () => {
    const pool = createFakePool();

    await createPostgresStore(pool).recordRulesAccepted('p1', '2026-11-03T10:00:00.000Z');

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('rules_accepted_at = $2'), ['p1', '2026-11-03T10:00:00.000Z']);
  });

  test('loadState brings back who has confirmed the rules', async () => {
    const pool = createFakePool();
    pool.query = jest.fn(async (sql) => ({
      rows: sql.includes('FROM players')
        ? [
            { id: 'p1', name: 'Anna', credits: '10', created_at: new Date('2026-01-01'), rules_accepted_at: new Date('2026-02-01T00:00:00.000Z') },
            { id: 'p2', name: 'Bruno', credits: '0', created_at: new Date('2026-01-01'), rules_accepted_at: null },
          ]
        : [],
    }));

    const { players } = await createPostgresStore(pool).loadState();

    expect(players.p1.regoleAccettateIl).toBe('2026-02-01T00:00:00.000Z');
    expect(players.p2.regoleAccettateIl).toBeNull();
  });

  test('writes for the same game do not overlap and the last state wins', async () => {
    let active = 0;
    let maxActive = 0;
    const pool = createFakePool({
      onQuery: async (sql) => {
        if (sql === 'BEGIN') {
          active += 1;
          maxActive = Math.max(maxActive, active);
        }
        await new Promise((resolve) => setImmediate(resolve));
        if (sql === 'COMMIT') {
          active -= 1;
        }
      },
    });
    const store = createPostgresStore(pool);

    await Promise.all([
      store.saveGame(game('waiting')),
      store.saveGame(game('playing')),
      store.saveGame(game('finished')),
    ]);

    const inserts = pool.log.filter((q) => q.sql.startsWith('INSERT INTO games'));
    expect(maxActive).toBe(1);
    expect(inserts[inserts.length - 1].params[1]).toBe('finished');
    expect(store.status().pendingWrites).toBe(0);
  });

  test('a failed game write keeps its movements and retries them once', async () => {
    let failures = 1;
    const pool = createFakePool({
      onQuery: (sql) => {
        if (sql.startsWith('UPDATE players') && failures > 0) {
          failures -= 1;
          throw new Error('connection lost');
        }
      },
    });
    const store = createPostgresStore(pool, { retryDelayMs: 1 });
    const movement = { playerId: 'p1', gameId: 'g1', type: 'game_entry', amount: -100 };

    await expect(store.saveGame(game(), [movement])).rejects.toThrow('connection lost');
    expect(store.status().pendingWrites).toBe(1);
    expect(store.status().lastFailureAt).not.toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(store.status().pendingWrites).toBe(0);
    expect(statements(pool).filter((s) => s === 'COMMIT')).toHaveLength(1);
    expect(pool.log.filter((q) => q.sql.startsWith('INSERT INTO credit_transactions'))).toHaveLength(1);
    await store.close();
  });

  test('close writes pending changes before ending the pool', async () => {
    let failures = 1;
    const pool = createFakePool({
      onQuery: (sql) => {
        if (sql.startsWith('INSERT INTO games') && failures > 0) {
          failures -= 1;
          throw new Error('down');
        }
      },
    });
    const store = createPostgresStore(pool, { retryDelayMs: 60000 });

    await expect(store.saveGame(game())).rejects.toThrow('down');
    await store.close();

    expect(statements(pool)).toContain('COMMIT');
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  test('deleteGame removes the row', async () => {
    const pool = createFakePool();
    await createPostgresStore(pool).deleteGame('g1');

    const del = pool.log.find((q) => q.sql.startsWith('DELETE FROM games'));
    expect(del.params).toEqual(['g1']);
  });

  test('loadState converts balances and rebuilds currentGameId', async () => {
    const pool = createFakePool();
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 'p1', name: 'A', credits: '250', created_at: new Date('2026-01-01T00:00:00.000Z') }],
      })
      .mockResolvedValueOnce({ rows: [{ state: { id: 'g1', players: [{ id: 'p1' }] } }] });

    const { players, games } = await createPostgresStore(pool).loadState();

    expect(players.p1.credits).toBe(250);
    expect(players.p1.currentGameId).toBe('g1');
    expect(players.p1.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(games.g1.id).toBe('g1');
  });
});

describe('decideRotation', () => {
  const now = new Date('2026-01-01T12:00:00Z');
  const secondsAgo = (s) => new Date(now.getTime() - s * 1000);
  const valid = { expiresAt: new Date(now.getTime() + 60000), rotatedAt: null, revokedAt: null };

  test.each([
    ['unknown token', undefined, 'invalid'],
    ['expired token', { ...valid, expiresAt: secondsAgo(1) }, 'invalid'],
    ['revoked token', { ...valid, revokedAt: secondsAgo(1) }, 'invalid'],
    ['revoked token, even if just rotated', { ...valid, rotatedAt: secondsAgo(1), revokedAt: secondsAgo(1) }, 'invalid'],
    ['current token', valid, 'rotate'],
    ['token rotated moments ago', { ...valid, rotatedAt: secondsAgo(5) }, 'grace'],
    ['token rotated long ago', { ...valid, rotatedAt: secondsAgo(11) }, 'reuse'],
  ])('%s', (_name, record, expected) => {
    expect(decideRotation(record, 10, now)).toBe(expected);
  });
});

describe('createMemoryStore', () => {
  test('exposes the same methods as the PostgreSQL store', () => {
    const memory = Object.keys(createMemoryStore()).sort();
    const postgres = Object.keys(createPostgresStore(createFakePool())).sort();
    expect(memory).toEqual(postgres);
  });

  test('reports persistence as disabled and finds nothing', async () => {
    const store = createMemoryStore();
    expect(store.status().enabled).toBe(false);
    await expect(store.findGame('g1')).resolves.toBeNull();
  });
});
