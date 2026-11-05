/**
 * Persistence Store Tests
 *
 * Use a fake pool to check transactions, write ordering and retries.
 * postgres.integration.test.js covers the real SQL.
 */

import { jest } from '@jest/globals';
import {
  createMemoryStore,
  createPostgresStore,
  decideRotation,
  INSUFFICIENT_CREDITS,
  INVALID_ROLE,
  LAST_ADMIN,
  USERNAME_TAKEN,
} from '../../src/db/store.js';

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

  test('a running jolly choice is not saved: it is a pause of a few seconds', async () => {
    const pool = createFakePool();
    const g = { ...game('playing'), jollyInCorso: { playerId: 'p1', tipo: 'tris', scadenza: 1 } };

    await createPostgresStore(pool).saveGame(g);

    const insert = pool.log.find((q) => q.sql.startsWith('INSERT INTO games'));
    expect(JSON.parse(insert.params[6])).not.toHaveProperty('jollyInCorso');
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

describe('roles of the memory store', () => {
  const system = { type: 'system' };
  let store;

  const makeAccount = (id, usernameKey = id) =>
    store.createAccount({ id }, { usernameKey, passwordHash: 'hash' });

  beforeEach(async () => {
    store = createMemoryStore();
    await makeAccount('p1');
    await makeAccount('p2');
    await makeAccount('p3');
  });

  test('every account starts as a player, and nobody is admin', async () => {
    await expect(store.findAccountById('p1')).resolves.toMatchObject({ role: 'player' });
    await expect(store.countAdmins()).resolves.toBe(0);
  });

  test('promotes and demotes, and says what changed', async () => {
    await makeAccount('p4');
    await store.setAccountRole('p4', 'admin', { actor: system });

    await expect(store.setAccountRole('p1', 'admin', { actor: system }))
      .resolves.toEqual({ playerId: 'p1', role: 'admin', previousRole: 'player', changed: true });
    await expect(store.findAccountById('p1')).resolves.toMatchObject({ role: 'admin' });
    await expect(store.countAdmins()).resolves.toBe(2);

    await expect(store.setAccountRole('p1', 'player', { actor: system }))
      .resolves.toEqual({ playerId: 'p1', role: 'player', previousRole: 'admin', changed: true });
  });

  test('doing it twice changes nothing and leaves no second trace', async () => {
    await store.setAccountRole('p1', 'admin', { actor: system });

    await expect(store.setAccountRole('p1', 'admin', { actor: system }))
      .resolves.toEqual({ playerId: 'p1', role: 'admin', previousRole: 'admin', changed: false });
    await expect(store.listAuditEvents()).resolves.toHaveLength(1);
  });

  test('an unknown player gives null and changes nothing', async () => {
    await expect(store.setAccountRole('ghost', 'admin', { actor: system })).resolves.toBeNull();
    await expect(store.countAdmins()).resolves.toBe(0);
    await expect(store.listAuditEvents()).resolves.toEqual([]);
  });

  test('the only admin cannot be demoted, but one of two can', async () => {
    await store.setAccountRole('p1', 'admin', { actor: system });

    await expect(store.setAccountRole('p1', 'player', { actor: system })).rejects.toMatchObject({ code: LAST_ADMIN });
    await expect(store.countAdmins()).resolves.toBe(1);

    await store.setAccountRole('p2', 'admin', { actor: system });
    await expect(store.setAccountRole('p1', 'player', { actor: system })).resolves.toMatchObject({ changed: true });
    await expect(store.countAdmins()).resolves.toBe(1);
  });

  test('a role that does not exist is refused', async () => {
    await expect(store.setAccountRole('p1', 'root', { actor: system })).rejects.toMatchObject({ code: INVALID_ROLE });
    await expect(store.findAccountById('p1')).resolves.toMatchObject({ role: 'player' });
  });

  test('without the one who acts it refuses, so that nothing changes without a trace', async () => {
    await expect(store.setAccountRole('p1', 'admin')).rejects.toThrow();
    await expect(store.countAdmins()).resolves.toBe(0);
  });

  test('every change is written in the audit log, the latest first', async () => {
    await store.setAccountRole('p1', 'admin', { actor: system });
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
    expect(events[1]).toMatchObject({ actorType: 'system', actorId: null, targetId: 'p1' });
    expect(events[0].createdAt).toBeInstanceOf(Date);
  });

  test('a refused change leaves no trace in the audit log', async () => {
    await store.setAccountRole('p1', 'admin', { actor: system });
    await store.setAccountRole('p1', 'player', { actor: system }).catch(() => {});

    await expect(store.listAuditEvents()).resolves.toHaveLength(1);
  });

  test('the audit log can be limited', async () => {
    await store.setAccountRole('p1', 'admin', { actor: system });
    await store.setAccountRole('p2', 'admin', { actor: system });

    await expect(store.listAuditEvents({ limit: 1 })).resolves.toHaveLength(1);
  });
});

describe('accounts of the memory store: list, rename, credits', () => {
  const system = { type: 'system' };
  let store;

  beforeEach(async () => {
    store = createMemoryStore();
    for (const [id, username] of [['p1', 'Anna'], ['p2', 'Carlo Rossi'], ['p3', 'Dario'], ['p4', 'Anna Maria']]) {
      await store.createAccount({ id }, { username, usernameKey: username.toLowerCase(), passwordHash: 'hash' });
    }
    await store.setAccountRole('p3', 'admin', { actor: system });
  });

  describe('listAccounts', () => {
    test('lists the accounts by name, with the total, and never the password hash', async () => {
      const { items, total } = await store.listAccounts();

      expect(total).toBe(4);
      expect(items.map((a) => a.username)).toEqual(['Anna', 'Anna Maria', 'Carlo Rossi', 'Dario']);
      expect(items[0]).toEqual({ playerId: 'p1', username: 'Anna', role: 'player', createdAt: expect.any(Date) });
      expect(JSON.stringify(items)).not.toMatch(/hash/);
    });

    test('searches a part of the name, without caring about the case', async () => {
      const { items, total } = await store.listAccounts({ q: 'anna' });

      expect(items.map((a) => a.playerId)).toEqual(['p1', 'p4']);
      expect(total).toBe(2);
    });

    test('filters by role', async () => {
      const { items } = await store.listAccounts({ role: 'admin' });

      expect(items.map((a) => a.playerId)).toEqual(['p3']);
    });

    test('pages, and the total is the one of the whole result', async () => {
      const second = await store.listAccounts({ limit: 2, offset: 2 });

      expect(second.items.map((a) => a.playerId)).toEqual(['p2', 'p3']);
      expect(second.total).toBe(4);
    });

    test('a search with the characters of a pattern finds only what contains them', async () => {
      await expect(store.listAccounts({ q: '%' })).resolves.toMatchObject({ total: 0 });
      await expect(store.listAccounts({ q: '_' })).resolves.toMatchObject({ total: 0 });
    });
  });

  describe('getAccount', () => {
    test('gives the account as the admin area shows it, without the password hash, or null', async () => {
      await expect(store.getAccount('p2')).resolves.toEqual({
        playerId: 'p2', username: 'Carlo Rossi', role: 'player', createdAt: expect.any(Date),
      });
      await expect(store.getAccount('ghost')).resolves.toBeNull();
    });
  });

  describe('setAccountUsername', () => {
    const rename = (playerId, username, extra = {}) =>
      store.setAccountUsername(playerId, { username, usernameKey: username.toLowerCase() }, { actor: system, ...extra });

    test('renames, and the old name is free again, the new one taken', async () => {
      await expect(rename('p2', 'Carlo Bianchi'))
        .resolves.toEqual({ playerId: 'p2', username: 'Carlo Bianchi', previousUsername: 'Carlo Rossi', changed: true });

      await expect(store.findAccountByUsernameKey('carlo bianchi')).resolves.toMatchObject({ playerId: 'p2' });
      await expect(store.findAccountByUsernameKey('carlo rossi')).resolves.toBeNull();
    });

    test('a name already in use by another account is refused, and nothing changes', async () => {
      await expect(rename('p2', 'ANNA')).rejects.toMatchObject({ code: USERNAME_TAKEN });

      await expect(store.findAccountByUsernameKey('carlo rossi')).resolves.toMatchObject({ playerId: 'p2' });
      await expect(store.listAuditEvents()).resolves.toHaveLength(1); // only the promotion of p3
    });

    test('the same name written with other capital letters is a change of the account itself', async () => {
      await expect(rename('p1', 'ANNA')).resolves.toMatchObject({ username: 'ANNA', previousUsername: 'Anna', changed: true });
    });

    test('the same name again changes nothing and leaves no trace', async () => {
      await expect(rename('p1', 'Anna')).resolves.toMatchObject({ changed: false });
      await expect(store.listAuditEvents()).resolves.toHaveLength(1);
    });

    test('an unknown player gives null', async () => {
      await expect(rename('ghost', 'Nobody')).resolves.toBeNull();
    });

    test('it needs to know who does it', async () => {
      await expect(store.setAccountUsername('p1', { username: 'Zeta', usernameKey: 'zeta' })).rejects.toThrow();
    });

    test('writes who renamed whom in the audit log', async () => {
      await rename('p2', 'Carlo Bianchi', { actor: { type: 'player', id: 'p3' } });

      const [event] = await store.listAuditEvents();

      expect(event).toMatchObject({
        action: 'username_changed',
        actorType: 'player',
        actorId: 'p3',
        targetId: 'p2',
        details: { from: 'Carlo Rossi', to: 'Carlo Bianchi' },
      });
    });
  });

  describe('adjustCredits (the balance itself is in the game state: the store writes the trace)', () => {
    test('writes the audit row with the amount and the reason, and answers with them', async () => {
      await expect(store.adjustCredits('p1', 50, { actor: system, reason: 'regalo' }))
        .resolves.toEqual({ playerId: 'p1', amount: 50 });

      const [event] = await store.listAuditEvents();
      expect(event).toMatchObject({
        action: 'credits_adjusted',
        actorType: 'system',
        targetId: 'p1',
        details: { amount: 50, reason: 'regalo' },
      });
    });

    test('an unknown player gives null and leaves no trace', async () => {
      await expect(store.adjustCredits('ghost', 50, { actor: system, reason: 'x' })).resolves.toBeNull();
      await expect(store.listAuditEvents()).resolves.toHaveLength(1);
    });

    test.each([
      ['no reason', { actor: system }],
      ['an empty reason', { actor: system, reason: '  ' }],
      ['no actor', { reason: 'x' }],
    ])('refuses %s', async (_name, options) => {
      await expect(store.adjustCredits('p1', 10, options)).rejects.toThrow();
    });

    test.each([0, 1.5, Number.NaN])('refuses an amount of %s', async (amount) => {
      await expect(store.adjustCredits('p1', amount, { actor: system, reason: 'x' })).rejects.toThrow();
    });

    test('exposes the error code of a balance that is not enough, for the services that use it', () => {
      expect(INSUFFICIENT_CREDITS).toBe('INSUFFICIENT_CREDITS');
    });
  });

  describe('the audit log by target and by page', () => {
    beforeEach(async () => {
      await store.adjustCredits('p1', 10, { actor: system, reason: 'uno' });
      await store.adjustCredits('p2', 20, { actor: system, reason: 'due' });
      await store.adjustCredits('p1', 30, { actor: system, reason: 'tre' });
    });

    test('filters by target', async () => {
      const events = await store.listAuditEvents({ targetId: 'p1' });

      expect(events.map((e) => e.details.reason)).toEqual(['tre', 'uno']);
      await expect(store.countAuditEvents({ targetId: 'p1' })).resolves.toBe(2);
    });

    test('pages from the latest', async () => {
      const page = await store.listAuditEvents({ limit: 2, offset: 1 });

      expect(page.map((e) => e.details.reason)).toEqual(['due', 'uno']);
      await expect(store.countAuditEvents()).resolves.toBe(4);
    });
  });
});
