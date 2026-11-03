/**
 * A game does not start until every player has confirmed that they read the rules.
 *
 * A player confirms once, the first time they use the game; the confirmation is saved with the
 * player. A game in the lobby shows who is still missing, and starts by itself (if it is full)
 * when the last one confirms.
 */

import { jest } from '@jest/globals';
import {
  createGame,
  getGame,
  joinGame,
  startGame,
} from '../../src/controllers/game.controller.js';
import { acceptRules as acceptRulesHandler } from '../../src/controllers/player.controller.js';
import { registerPlayer, buyCredits, acceptRules } from '../../src/services/player.service.js';
import { createMemoryStore } from '../../src/db/store.js';

describe('rules confirmation', () => {
  let gameState;
  let anna;
  let bruno;
  let emitted;
  let io;
  let store;

  const call = (handler, playerId, { params = {}, body = {} } = {}) =>
    new Promise((resolve, reject) => {
      const res = {
        status: () => res,
        json: (payload) => {
          resolve(JSON.parse(JSON.stringify(payload.data)));
          return res;
        },
      };
      handler(
        { params, body, gameState, io, store, auth: { playerId, role: 'player' } },
        res,
        reject,
      );
    });

  const eventsNamed = (event) => emitted.filter((e) => e.event === event);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Anna has read the rules, Bruno is new
  const lobby = async ({ maxPlayers = 5 } = {}) => {
    const { gameId } = await call(createGame, anna.id, { body: { requiredCredits: 100, maxPlayers } });
    await call(joinGame, anna.id, { params: { gameId } });
    await call(joinGame, bruno.id, { params: { gameId } });
    return { gameId, game: gameState.games[gameId] };
  };

  beforeEach(() => {
    gameState = { games: {}, players: {} };
    anna = registerPlayer(gameState, 'Anna');
    bruno = registerPlayer(gameState, 'Bruno');
    acceptRules(gameState, anna.id);
    buyCredits(gameState, anna.id, 500);
    buyCredits(gameState, bruno.id, 500);

    emitted = [];
    const roomFor = (room) => ({
      emit: (event, data) => emitted.push({ room, event, data: JSON.parse(JSON.stringify(data)) }),
      socketsJoin: () => {},
      socketsLeave: () => {},
    });
    io = { to: roomFor, in: roomFor };
    store = { ...createMemoryStore(), recordRulesAccepted: jest.fn().mockResolvedValue(undefined) };
  });

  describe('a new player', () => {
    test('has not read the rules yet', () => {
      expect(bruno.regoleAccettateIl).toBeNull();
      expect(anna.regoleAccettateIl).toEqual(expect.any(String));
    });

    test('confirming saves the date with the player, once', async () => {
      await call(acceptRulesHandler, bruno.id, { params: { playerId: bruno.id } });
      const first = bruno.regoleAccettateIl;

      await call(acceptRulesHandler, bruno.id, { params: { playerId: bruno.id } });

      expect(first).toEqual(expect.any(String));
      expect(bruno.regoleAccettateIl).toBe(first);
      expect(store.recordRulesAccepted).toHaveBeenCalledTimes(1);
      expect(store.recordRulesAccepted).toHaveBeenCalledWith(bruno.id, first);
    });

    test('if the date cannot be saved, the confirmation does not stand', async () => {
      store.recordRulesAccepted.mockRejectedValue(new Error('db down'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(call(acceptRulesHandler, bruno.id, { params: { playerId: bruno.id } })).rejects.toMatchObject({
        statusCode: 503,
      });
      expect(bruno.regoleAccettateIl).toBeNull();
      console.error.mockRestore();
    });
  });

  describe('in the lobby', () => {
    test('each player says whether they have read the rules, and everybody can see it', async () => {
      const { gameId } = await lobby();

      const view = await call(getGame, anna.id, { params: { gameId } });

      expect(view.players.find((p) => p.id === anna.id).regoleLette).toBe(true);
      expect(view.players.find((p) => p.id === bruno.id).regoleLette).toBe(false);
    });

    test('confirming updates the game the player is in, and tells the room', async () => {
      const { gameId, game } = await lobby();

      await call(acceptRulesHandler, bruno.id, { params: { playerId: bruno.id } });

      expect(game.players.find((p) => p.id === bruno.id).regoleLette).toBe(true);
      const [event] = eventsNamed('regoleConfermate');
      expect(event.room).toBe(gameId);
      expect(event.data).toEqual({ playerId: bruno.id });
    });
  });

  describe('starting', () => {
    test('the creator cannot start while someone has not confirmed, and the answer says why', async () => {
      const { gameId, game } = await lobby();

      await expect(call(startGame, anna.id, { params: { gameId } })).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringMatching(/rules/i),
      });
      expect(game.status).toBe('waiting');
      expect(gameState.players[anna.id].credits).toBe(500);
    });

    test('the creator can start once everybody has confirmed', async () => {
      const { gameId, game } = await lobby();
      await call(acceptRulesHandler, bruno.id, { params: { playerId: bruno.id } });

      await call(startGame, anna.id, { params: { gameId } });

      expect(game.status).toBe('playing');
    });

    test('a full game does not start by itself while someone has not confirmed', async () => {
      const { game } = await lobby({ maxPlayers: 2 });

      await wait(250);

      expect(game.status).toBe('waiting');
      expect(eventsNamed('gameStarted')).toHaveLength(0);
    });

    test('a full game starts by itself when the last player confirms', async () => {
      const { game } = await lobby({ maxPlayers: 2 });
      await wait(250);

      await call(acceptRulesHandler, bruno.id, { params: { playerId: bruno.id } });
      await wait(250);

      expect(game.status).toBe('playing');
      // the game is sent to the room of each of the two players
      expect(eventsNamed('gameStarted')).toHaveLength(2);
    });

    test('a game that is not full does not start when someone confirms', async () => {
      const { game } = await lobby({ maxPlayers: 5 });

      await call(acceptRulesHandler, bruno.id, { params: { playerId: bruno.id } });
      await wait(250);

      expect(game.status).toBe('waiting');
    });
  });
});
