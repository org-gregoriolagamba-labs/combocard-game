/**
 * Auth Middleware and Socket Authentication Tests
 */

import { jest } from '@jest/globals';
import { requireAuth, requireSelf } from '../../src/middleware/auth.middleware.js';
import { authenticateSocket, initializeSocketHandlers, playerRoom } from '../../src/sockets/index.js';
import { signAccessToken } from '../../src/services/auth.service.js';

const gameState = {
  players: { p1: { id: 'p1', currentGameId: null }, p2: { id: 'p2', currentGameId: 'g1' } },
  games: { g1: { id: 'g1', players: [{ id: 'p2' }] } },
};

const runRequireAuth = (authorization) => {
  const req = { headers: { authorization }, gameState };
  const next = jest.fn();
  requireAuth(req, {}, next);
  return { req, next };
};

describe('requireAuth', () => {
  test('sets the identity from a valid token', () => {
    const { req, next } = runRequireAuth(`Bearer ${signAccessToken('p1', 'player')}`);

    expect(req.auth).toEqual({ playerId: 'p1', role: 'player' });
    expect(next).toHaveBeenCalledWith();
  });

  test.each([
    ['no header', undefined],
    ['a wrong scheme', `Basic ${signAccessToken('p1', 'player')}`],
    ['an invalid token', 'Bearer nope'],
    ['a token of a player that no longer exists', `Bearer ${signAccessToken('ghost', 'player')}`],
  ])('rejects %s', (_name, header) => {
    const { req, next } = runRequireAuth(header);

    expect(req.auth).toBeUndefined();
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
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
  const connect = (auth) => {
    const socket = { handshake: { auth }, data: {} };
    const next = jest.fn();
    authenticateSocket(gameState)(socket, next);
    return { socket, next };
  };

  test('accepts a valid token and remembers the player', () => {
    const { socket, next } = connect({ token: signAccessToken('p1', 'player') });

    expect(socket.data.playerId).toBe('p1');
    expect(next).toHaveBeenCalledWith();
  });

  test.each([[{}], [{ token: 'nope' }], [{ token: 123 }], [undefined]])('rejects %j', (auth) => {
    const { next } = connect(auth);
    expect(next.mock.calls[0][0].message).toBe('Unauthorized');
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
    initializeSocketHandlers(io, gameState);
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
