/**
 * Admin Controller Tests
 *
 * The HTTP side of the admin area: what the handlers answer and what they tell the players.
 */

import { jest } from '@jest/globals';
import {
  adjustCredits,
  cancelGame,
  deleteUser,
  getStats,
  getUser,
  listGames,
  listAuditLog,
  listUsers,
  resetPassword,
  revokeSessions,
  suspendUser,
  unsuspendUser,
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
          resolve({ code: res.code, headers: res.headers, ...payload });
          return res;
        },
        set: (name, value) => {
          res.headers = { ...res.headers, [name]: value };
          return res;
        },
      };
      handler({ params, body, query, store, gameState, io, auth: { playerId, role: 'admin' } }, res, reject);
    });

  beforeEach(async () => {
    store = createMemoryStore();
    gameState = { players: {}, games: {} };
    emitted = [];
    io = { to: (room) => ({ emit: (event, payload) => emitted.push({ room, event, payload }) }), in: (room) => ({ socketsJoin: () => {}, socketsLeave: (gameId) => emitted.push({ room, event: 'socketsLeave', payload: gameId }), disconnectSockets: (close) => emitted.push({ room, event: 'disconnectSockets', payload: close }) }) };
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
    expect(answer.data.items[0]).toMatchObject({ action: 'credits_adjusted', targetId: 'p1', actorName: 'Dario', targetName: 'Anna' });
  });
  describe('games', () => {
    const addGame = (id, status, playerIds, credits = 0) => {
      gameState.games[id] = {
        id, status, isPrivate: false, requiredCredits: 100, maxPlayers: 4, montepremi: 0, createdAt: '2026-01-01T00:00:00.000Z',
        mazzo: [{ valore: '7', seme: 'coppe' }], carteEstratte: [],
        players: playerIds.map((pid) => ({ id: pid, name: gameState.players[pid].name, cartella: [[{ valore: 'A' }]], gettoni: credits, collezioni: [] })),
      };
      playerIds.forEach((pid) => { gameState.players[pid].currentGameId = id; });
    };

    test('listGames answers with metadata only', async () => {
      addGame('g1', 'playing', ['p1', 'p2']);

      const answer = await call(listGames, { query: { page: 1, limit: 20 } });

      expect(answer.data.items).toHaveLength(1);
      expect(JSON.stringify(answer)).not.toMatch(/mazzo|cartella|carteEstratte|gettoni/);
    });

    test('cancelGame refunds, answers and tells each player, who leave the room of the game', async () => {
      addGame('g1', 'playing', ['p1', 'p2']);

      const answer = await call(cancelGame, { params: { gameId: 'g1' }, body: { reason: 'bloccata' } });

      expect(answer.data).toMatchObject({ gameId: 'g1', previousStatus: 'playing' });
      expect(answer.data.players).toEqual([
        { playerId: 'p1', credits: 200, refund: 100 },
        { playerId: 'p2', credits: 150, refund: 100 },
      ]);
      expect(emitted).toEqual(expect.arrayContaining([
        { room: playerRoom('p1'), event: 'gameCancelled', payload: { gameId: 'g1', gettoni: 200, refund: 100 } },
        { room: playerRoom('p2'), event: 'gameCancelled', payload: { gameId: 'g1', gettoni: 150, refund: 100 } },
        { room: playerRoom('p1'), event: 'socketsLeave', payload: 'g1' },
      ]));
    });

    test('suspendUser suspends, tells the user that the session is over and closes their connections', async () => {
      const answer = await call(suspendUser, { params: { playerId: 'p1' }, body: { reason: 'abuso' } });

      expect(answer.data).toMatchObject({ playerId: 'p1', suspended: true });
      expect(emitted).toEqual([
        { room: playerRoom('p1'), event: 'sessionEnded', payload: { reason: 'suspended' } },
        { room: playerRoom('p1'), event: 'disconnectSockets', payload: true },
      ]);
    });

    test('revokeSessions closes the connections of the user, who is not suspended', async () => {
      const answer = await call(revokeSessions, { params: { playerId: 'p1' }, body: { reason: 'furto' } });

      expect(answer.data).toMatchObject({ playerId: 'p1', suspended: false });
      expect(emitted).toEqual([
        { room: playerRoom('p1'), event: 'sessionEnded', payload: { reason: 'revoked' } },
        { room: playerRoom('p1'), event: 'disconnectSockets', payload: true },
      ]);
    });

    test('resetPassword gives the temporary password once, not to be kept, and closes the sessions of the user', async () => {
      const answer = await call(resetPassword, { params: { playerId: 'p1' }, body: { reason: 'dimenticata' } });

      expect(answer.data.user).toMatchObject({ playerId: 'p1', username: 'Anna' });
      expect(answer.data.temporaryPassword).toEqual(expect.any(String));
      expect(answer.headers['Cache-Control']).toBe('no-store');
      expect(emitted).toEqual([
        { room: playerRoom('p1'), event: 'sessionEnded', payload: { reason: 'revoked' } },
        { room: playerRoom('p1'), event: 'disconnectSockets', payload: true },
      ]);
      expect(JSON.stringify(await store.listAuditEvents({}))).not.toContain(answer.data.temporaryPassword);
    });

    test('resetPassword tells nobody when it is refused', async () => {
      await expect(call(resetPassword, { params: { playerId: 'p3' }, body: { reason: 'x' }, playerId: 'p3' })).rejects.toMatchObject({ statusCode: 409 });
      await expect(call(resetPassword, { params: { playerId: 'ghost' }, body: { reason: 'x' } })).rejects.toMatchObject({ statusCode: 404 });
      expect(emitted).toEqual([]);
    });

    test('deleteUser deletes, tells the user that the account is gone and closes their connections', async () => {
      const answer = await call(deleteUser, { params: { playerId: 'p1' }, body: { reason: 'abuso' } });

      expect(answer.data).toEqual({ playerId: 'p1', credits: 100 });
      expect(emitted).toEqual([
        { room: playerRoom('p1'), event: 'sessionEnded', payload: { reason: 'deleted' } },
        { room: playerRoom('p1'), event: 'disconnectSockets', payload: true },
      ]);
      expect(gameState.players.p1).toBeUndefined();
    });

    test('deleteUser tells nobody when it is refused', async () => {
      await expect(call(deleteUser, { params: { playerId: 'p3' }, body: { reason: 'x' }, playerId: 'p3' })).rejects.toMatchObject({ statusCode: 409 });
      await expect(call(deleteUser, { params: { playerId: 'ghost' }, body: { reason: 'x' } })).rejects.toMatchObject({ statusCode: 404 });
      expect(emitted).toEqual([]);
    });

    test('unsuspendUser reinstates and tells nobody', async () => {
      await call(suspendUser, { params: { playerId: 'p1' }, body: { reason: 'abuso' } });
      emitted.length = 0;

      const answer = await call(unsuspendUser, { params: { playerId: 'p1' }, body: { reason: 'chiarito' } });

      expect(answer.data).toMatchObject({ suspended: false });
      expect(emitted).toEqual([]);
    });

    test('suspendUser acts as the admin who asks, tells nobody when it is refused', async () => {
      await expect(call(suspendUser, { params: { playerId: 'p3' }, body: { reason: 'x' }, playerId: 'p3' })).rejects.toMatchObject({ statusCode: 409 });
      await expect(call(suspendUser, { params: { playerId: 'ghost' }, body: { reason: 'x' } })).rejects.toMatchObject({ statusCode: 404 });
      expect(emitted).toEqual([]);
    });

    test('cancelGame tells nobody when it is refused', async () => {
      await expect(call(cancelGame, { params: { gameId: 'ghost' }, body: { reason: 'x' } })).rejects.toMatchObject({ statusCode: 404 });

      expect(emitted).toEqual([]);
    });

    test('getStats answers with the numbers', async () => {
      addGame('g1', 'playing', ['p1']);

      const answer = await call(getStats);

      expect(answer.data).toMatchObject({ users: { registered: 3, inGame: 1 }, games: { playing: 1 } });
    });
  });
});
