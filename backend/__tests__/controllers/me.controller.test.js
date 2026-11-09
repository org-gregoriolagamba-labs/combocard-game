/**
 * The history and the statistics of the player who asks
 *
 * The player is the one of the token: nothing in the request can point at another one.
 */

import { jest } from '@jest/globals';
import { getMovements, getStats } from '../../src/controllers/me.controller.js';
import { meMovementsQuerySchema } from '../../src/validation/schemas.js';

const call = (handler, { query = {}, params = {}, body = {}, store, playerId = 'p1' }) =>
  new Promise((resolve, reject) => {
    const res = {
      status: () => res,
      json: (payload) => {
        resolve(payload.data);
        return res;
      },
    };
    handler({ query, params, body, store, gameState: { players: {}, games: {} }, auth: { playerId, role: 'player' } }, res, reject);
  });

describe('GET /api/me/movements', () => {
  test('reads the movements of the player of the token, page by page', async () => {
    const store = { listPlayerMovements: jest.fn().mockResolvedValue({ items: [{ id: 1 }], total: 41 }) };

    const data = await call(getMovements, { store, query: { page: 3, limit: 20 } });

    expect(store.listPlayerMovements).toHaveBeenCalledWith('p1', { limit: 20, offset: 40, type: null, from: null, to: null });
    expect(data).toEqual({ disponibile: true, items: [{ id: 1 }], total: 41, page: 3, limit: 20 });
  });

  test('a player id in the request is ignored: it is always the own one', async () => {
    const store = { listPlayerMovements: jest.fn().mockResolvedValue({ items: [], total: 0 }) };

    await call(getMovements, { store, playerId: 'p1', query: { page: 1, limit: 20, playerId: 'p2' }, params: { playerId: 'p2' }, body: { playerId: 'p2' } });

    expect(store.listPlayerMovements.mock.calls[0][0]).toBe('p1');
  });

  test('passes the type and the period', async () => {
    const store = { listPlayerMovements: jest.fn().mockResolvedValue({ items: [], total: 0 }) };

    await call(getMovements, { store, query: { page: 1, limit: 10, type: 'game_payout', from: new Date('2026-01-01T00:00:00Z'), to: new Date('2026-02-01T00:00:00Z') } });

    expect(store.listPlayerMovements).toHaveBeenCalledWith('p1', {
      limit: 10,
      offset: 0,
      type: 'game_payout',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-02-01T00:00:00.000Z',
    });
  });

  test('without the database it says that the history is not available, and nothing else', async () => {
    const store = { listPlayerMovements: jest.fn().mockResolvedValue(null) };

    const data = await call(getMovements, { store, query: { page: 1, limit: 20 } });

    expect(data).toEqual({ disponibile: false });
  });
});

describe('GET /api/me/stats', () => {
  test('reads the statistics of the player of the token', async () => {
    const stats = { partiteGiocate: 3 };
    const store = { playerStats: jest.fn().mockResolvedValue(stats) };

    const data = await call(getStats, { store, playerId: 'p7', params: { playerId: 'p2' } });

    expect(store.playerStats).toHaveBeenCalledWith('p7');
    expect(data).toEqual({ disponibile: true, statistiche: stats });
  });

  test('without the database it says that the statistics are not available', async () => {
    const store = { playerStats: jest.fn().mockResolvedValue(null) };

    await expect(call(getStats, { store })).resolves.toEqual({ disponibile: false });
  });
});

describe('meMovementsQuerySchema', () => {
  const ok = (query) => meMovementsQuerySchema.validate(query, { stripUnknown: true });

  test('has defaults: the first page of 20', () => {
    expect(ok({}).value).toEqual({ page: 1, limit: 20 });
  });

  test('reads numbers from the text of a query string', () => {
    expect(ok({ page: '2', limit: '50' }).value).toMatchObject({ page: 2, limit: 50 });
  });

  test.each([
    [{ page: '0' }],
    [{ limit: '101' }],
    [{ limit: '0' }],
    [{ page: 'x' }],
    [{ type: 'password' }],
    [{ from: 'ieri' }],
    [{ from: '2026-02-01', to: '2026-01-01' }],
  ])('rejects %j', (query) => {
    expect(ok(query).error).toBeDefined();
  });

  test.each(['initial', 'purchase', 'game_entry', 'game_payout', 'game_refund', 'admin_adjustment', 'account_closed'])(
    'accepts the type %s',
    (type) => {
      expect(ok({ type }).error).toBeUndefined();
    },
  );

  test('drops what it does not know, a player id included', () => {
    expect(ok({ playerId: 'p2' }).value).toEqual({ page: 1, limit: 20 });
  });
});
