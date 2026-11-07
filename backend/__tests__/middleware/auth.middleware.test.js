/**
 * Auth Middleware and Socket Authentication Tests
 */

import { jest } from '@jest/globals';
import { requireAuth, requireAuthToChangePassword, requireRole, requireSelf } from '../../src/middleware/auth.middleware.js';
import { authenticateSocket, initializeSocketHandlers, playerRoom } from '../../src/sockets/index.js';
import { signAccessToken } from '../../src/services/auth.service.js';
import { createMemoryStore } from '../../src/db/store.js';

const gameState = {
  players: { p1: { id: 'p1', currentGameId: null }, p2: { id: 'p2', currentGameId: 'g1' } },
  games: { g1: { id: 'g1', players: [{ id: 'p2' }] } },
};

let store;

beforeEach(async () => {
  store = createMemoryStore();
  for (const id of ['p1', 'p2']) {
    await store.createAccount({ id }, { username: id, usernameKey: id, passwordHash: 'hash' });
  }
});

const runRequireAuth = async (authorization) => {
  const req = { headers: { authorization }, gameState, store };
  const next = jest.fn();
  await requireAuth(req, {}, next);
  return { req, next };
};

const admin = { type: 'player', id: 'p9' };

describe('requireAuth', () => {
  test('sets the identity from a valid token', async () => {
    const { req, next } = await runRequireAuth(`Bearer ${signAccessToken('p1', 'player')}`);

    expect(req.auth).toEqual({ playerId: 'p1', role: 'player' });
    expect(next).toHaveBeenCalledWith();
  });

  test('the role is the one of the account now, not the one the token was signed with', async () => {
    await store.setAccountRole('p1', 'admin', { actor: { type: 'system' } });

    const { req } = await runRequireAuth(`Bearer ${signAccessToken('p1', 'player')}`);

    expect(req.auth.role).toBe('admin');
  });

  test.each([
    ['no header', undefined],
    ['a wrong scheme', `Basic ${signAccessToken('p1', 'player')}`],
    ['an invalid token', 'Bearer nope'],
    ['a token of a player that no longer exists', `Bearer ${signAccessToken('ghost', 'player')}`],
  ])('rejects %s', async (_name, header) => {
    const { req, next } = await runRequireAuth(header);

    expect(req.auth).toBeUndefined();
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });

  test('a suspended account loses the access at the next request, with a token that is still valid', async () => {
    const header = `Bearer ${signAccessToken('p1', 'player')}`;
    await runRequireAuth(header).then(({ next }) => expect(next).toHaveBeenCalledWith());

    await store.setAccountSuspended('p1', true, { actor: admin, reason: 'abuso' });

    const { req, next } = await runRequireAuth(header);
    expect(req.auth).toBeUndefined();
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });

  test('the tokens from before the sessions were closed stop working, the new ones work', async () => {
    const before = `Bearer ${signAccessToken('p1', 'player', 0)}`;

    await store.revokeAccountSessions('p1', { actor: admin, reason: 'furto' });

    expect((await runRequireAuth(before)).next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    const { sessionVersion } = await store.findAccountById('p1');
    const after = await runRequireAuth(`Bearer ${signAccessToken('p1', 'player', sessionVersion)}`);
    expect(after.next).toHaveBeenCalledWith();
  });

  test('another account is not affected by the sessions closed for one', async () => {
    await store.revokeAccountSessions('p1', { actor: admin, reason: 'furto' });

    const { next } = await runRequireAuth(`Bearer ${signAccessToken('p2', 'player', 0)}`);

    expect(next).toHaveBeenCalledWith();
  });

  describe('an account that must change the password', () => {
    beforeEach(async () => {
      await store.resetAccountPassword('p1', 'temp-hash', { actor: admin, reason: 'dimenticata' });
    });
    const header = async () => `Bearer ${signAccessToken('p1', 'player', (await store.findAccountById('p1')).sessionVersion)}`;

    test('is refused with a 403 on every route, with a valid token', async () => {
      const { req, next } = await runRequireAuth(await header());

      expect(req.auth).toBeUndefined();
      expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, message: 'You must change your password first' });
    });

    test('is let through only by the guard of the password change', async () => {
      const req = { headers: { authorization: await header() }, gameState, store };
      const next = jest.fn();

      await requireAuthToChangePassword(req, {}, next);

      expect(req.auth).toEqual({ playerId: 'p1', role: 'player' });
      expect(next).toHaveBeenCalledWith();
    });

    test('the guard of the password change is not a door for the others: a suspended account is refused', async () => {
      const req = { headers: { authorization: await header() }, gameState, store };
      const next = jest.fn();
      await store.setAccountSuspended('p1', true, { actor: admin, reason: 'x' });

      await requireAuthToChangePassword(req, {}, next);

      expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    });
  });

  test('if the store cannot answer, the request fails with the error and is not let through', async () => {
    store.findAccountById = jest.fn().mockRejectedValue(new Error('db down'));

    const { req, next } = await runRequireAuth(`Bearer ${signAccessToken('p1', 'player')}`);

    expect(req.auth).toBeUndefined();
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});

describe('requireSelf', () => {
  test('lets a player access their own data', () => {
    const next = jest.fn();
    requireSelf({ params: { playerId: 'p1' }, auth: { playerId: 'p1' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('blocks access to another player', () => {
    const next = jest.fn();
    requireSelf({ params: { playerId: 'p2' }, auth: { playerId: 'p1' } }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });
});

describe('authenticateSocket', () => {
  const connect = async (auth) => {
    const socket = { handshake: { auth }, data: {} };
    const next = jest.fn();
    await authenticateSocket(gameState, () => store)(socket, next);
    return { socket, next };
  };

  test('accepts a valid token and remembers the player', async () => {
    const { socket, next } = await connect({ token: signAccessToken('p1', 'player') });

    expect(socket.data.playerId).toBe('p1');
    expect(next).toHaveBeenCalledWith();
  });

  test('rejects an account that must change the password: the game is not for it yet', async () => {
    await store.resetAccountPassword('p1', 'temp-hash', { actor: admin, reason: 'x' });
    const { sessionVersion } = await store.findAccountById('p1');

    const { next } = await connect({ token: signAccessToken('p1', 'player', sessionVersion) });

    expect(next.mock.calls[0][0].message).toBe('Unauthorized');
  });

  test.each([[{}], [{ token: 'nope' }], [{ token: 123 }], [undefined]])('rejects %j', async (auth) => {
    const { next } = await connect(auth);
    expect(next.mock.calls[0][0].message).toBe('Unauthorized');
  });

  test('rejects a suspended account and the token of sessions that were closed', async () => {
    await store.setAccountSuspended('p1', true, { actor: admin, reason: 'abuso' });
    await store.revokeAccountSessions('p2', { actor: admin, reason: 'furto' });

    expect((await connect({ token: signAccessToken('p1', 'player') })).next.mock.calls[0][0].message).toBe('Unauthorized');
    expect((await connect({ token: signAccessToken('p2', 'player', 0) })).next.mock.calls[0][0].message).toBe('Unauthorized');
  });
});

describe('socket rooms', () => {
  const connectSocket = (playerId) => {
    const handlers = {};
    let onConnection;
    const io = {
      use: () => {},
      on: (_event, handler) => { onConnection = handler; },
    };
    const socket = {
      id: 's1',
      data: { playerId },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      on: (event, handler) => { handlers[event] = handler; },
    };
    initializeSocketHandlers(io, gameState, () => store);
    onConnection(socket);
    return { socket, handlers };
  };

  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('a connection enters the room of its player and of the current game', () => {
    const { socket } = connectSocket('p2');
    expect(socket.join).toHaveBeenCalledWith(playerRoom('p2'));
    expect(socket.join).toHaveBeenCalledWith('g1');
  });

  test('a player of the game can join its room', () => {
    const { socket, handlers } = connectSocket('p2');
    socket.join.mockClear();

    handlers.joinGame('g1');

    expect(socket.join).toHaveBeenCalledWith('g1');
  });

  test.each([['g1'], ['missing'], [undefined], [{ id: 'g1' }], ['__proto__']])(
    'another player cannot join the room %j',
    (gameId) => {
      const { socket, handlers } = connectSocket('p1');
      socket.join.mockClear();

      handlers.joinGame(gameId);

      expect(socket.join).not.toHaveBeenCalled();
    },
  );

  test('a player cannot leave their own player room', () => {
    const { socket, handlers } = connectSocket('p1');

    handlers.leaveGame(playerRoom('p1'));

    expect(socket.leave).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  // The role is read from the store at every request: the one in the token can be 15 minutes old
  const run = async ({ auth = { playerId: 'p1', role: 'player' }, account, storeError, ...request } = {}) => {
    const store = {
      findAccountById: jest.fn(async () => {
        if (storeError) throw storeError;
        return account;
      }),
    };
    const req = { auth, store, body: {}, query: {}, headers: {}, ...request };
    const next = jest.fn();
    await requireRole('admin')(req, {}, next);
    return { req, next, store };
  };

  test('lets an admin through', async () => {
    const { next } = await run({ auth: { playerId: 'p1', role: 'admin' }, account: { playerId: 'p1', role: 'admin' } });

    expect(next).toHaveBeenCalledWith();
  });

  test('refuses a player with 403', async () => {
    const { next } = await run({ account: { playerId: 'p1', role: 'player' } });

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });

  test('refuses at once an admin who was demoted, even with a token that still says admin', async () => {
    const { next } = await run({ auth: { playerId: 'p1', role: 'admin' }, account: { playerId: 'p1', role: 'player' } });

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });

  test('lets through a player who was just promoted, even with a token that still says player', async () => {
    const { req, next } = await run({ account: { playerId: 'p1', role: 'admin' } });

    expect(next).toHaveBeenCalledWith();
    expect(req.auth.role).toBe('admin');
  });

  test('refuses an account that no longer exists with 401', async () => {
    const { next } = await run({ auth: { playerId: 'p1', role: 'admin' }, account: null });

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });

  test('refuses a request that is not authenticated with 401, without reading the store', async () => {
    const { next, store } = await run({ auth: null });

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    expect(store.findAccountById).not.toHaveBeenCalled();
  });

  test('ignores a role written in the body, in the query or in a header', async () => {
    const { next } = await run({
      account: { playerId: 'p1', role: 'player' },
      body: { role: 'admin' },
      query: { role: 'admin' },
      headers: { 'x-role': 'admin' },
    });

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });

  test('passes a store error on, and lets nobody through', async () => {
    const failure = new Error('database down');
    const { next } = await run({ storeError: failure });

    expect(next).toHaveBeenCalledWith(failure);
  });

  test('accepts more than one role, and says which ones it asks for', async () => {
    const guard = requireRole('admin', 'player');
    const next = jest.fn();

    await guard({ auth: { playerId: 'p1' }, store: { findAccountById: async () => ({ role: 'player' }) } }, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(guard.requiredRoles).toEqual(['admin', 'player']);
  });
});
