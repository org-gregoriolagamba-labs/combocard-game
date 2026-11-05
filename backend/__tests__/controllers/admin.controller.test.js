/**
 * Admin Controller Tests
 *
 * The HTTP side of the admin area: what the handlers answer and what they tell the players.
 */

import { jest } from '@jest/globals';
import {
  adjustCredits,
  getUser,
  listAuditLog,
  listUsers,
  updateUser,
} from '../../src/controllers/admin.controller.js';
import { createMemoryStore } from '../../src/db/store.js';
import { playerRoom } from '../../src/sockets/index.js';

describe('admin controller', () => {
  let store;
  let gameState;
  let emitted;
  let io;

  const call = (handler, { params = {}, body = {}, query = {}, playerId = 'p3' } = {}) =>
    new Promise((resolve, reject) => {
      const res = {
        status: (code) => {
          res.code = code;
          return res;
        },
        json: (payload) => {
          resolve({ code: res.code, ...payload });
          return res;
        },
      };
      handler({ params, body, query, store, gameState, io, auth: { playerId, role: 'admin' } }, res, reject);
    });

  beforeEach(async () => {
    store = createMemoryStore();
    gameState = { players: {}, games: {} };
    emitted = [];
    io = { to: (room) => ({ emit: (event, payload) => emitted.push({ room, event, payload }) }), in: () => ({ socketsJoin: () => {} }) };
    for (const [id, username, credits] of [['p1', 'Anna', 100], ['p2', 'Carlo', 50], ['p3', 'Dario', 0]]) {
      await store.createAccount({ id }, { username, usernameKey: username.toLowerCase(), passwordHash: 'hash' });
      gameState.players[id] = { id, name: username, credits, currentGameId: null };
    }
    await store.setAccountRole('p3', 'admin', { actor: { type: 'system' } });
  });

  test('listUsers answers with the page', async () => {
    const answer = await call(listUsers, { query: { page: 1, limit: 20 } });

    expect(answer.data).toMatchObject({ total: 3, page: 1, limit: 20 });
    expect(answer.data.items.map((u) => u.username)).toEqual(['Anna', 'Carlo', 'Dario']);
    expect(JSON.stringify(answer)).not.toMatch(/passwordHash|hash/);
  });

  test('getUser answers with one user, and a 404 for one that does not exist', async () => {
    await expect(call(getUser, { params: { playerId: 'p2' } })).resolves.toMatchObject({ data: { username: 'Carlo', credits: 50 } });
    await expect(call(getUser, { params: { playerId: 'ghost' } })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('updateUser changes the role, as the admin who is asking and never as someone from the body', async () => {
    const answer = await call(updateUser, { params: { playerId: 'p1' }, body: { role: 'admin', actor: 'p9' } });

    expect(answer.data).toMatchObject({ playerId: 'p1', role: 'admin' });
    const [event] = await store.listAuditEvents({ targetId: 'p1' });
    expect(event).toMatchObject({ actorType: 'player', actorId: 'p3' });
  });

  test('adjustCredits answers with the new balance, and tells the player at once', async () => {
    const answer = await call(adjustCredits, { params: { playerId: 'p1' }, body: { amount: 25, reason: 'regalo' } });

    expect(answer.data).toEqual({ playerId: 'p1', credits: 125 });
    expect(emitted).toEqual([{ room: playerRoom('p1'), event: 'gettoniAggiornati', payload: { playerId: 'p1', gettoni: 125 } }]);
  });

  test('adjustCredits tells nobody when it is refused', async () => {
    await expect(call(adjustCredits, { params: { playerId: 'p2' }, body: { amount: -500, reason: 'x' } }))
      .rejects.toMatchObject({ statusCode: 409 });

    expect(emitted).toEqual([]);
  });

  test('listAuditLog answers with the events of a target', async () => {
    await call(adjustCredits, { params: { playerId: 'p1' }, body: { amount: 25, reason: 'regalo' } });

    const answer = await call(listAuditLog, { query: { targetId: 'p1', page: 1, limit: 20 } });

    expect(answer.data.total).toBe(1);
    expect(answer.data.items[0]).toMatchObject({ action: 'credits_adjusted', targetId: 'p1' });
  });
});
