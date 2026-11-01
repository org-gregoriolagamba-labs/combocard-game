/**
 * Game Authorization Tests
 *
 * The acting player always comes from req.auth, whatever the body says.
 */

import {
  createGame,
  getGame,
  joinGame,
  startGame,
  drawCard,
  leaveGame,
} from '../../src/controllers/game.controller.js';
import { registerPlayer, buyCredits } from '../../src/services/player.service.js';
import { createMemoryStore } from '../../src/db/store.js';

const room = { emit: () => {}, socketsJoin: () => {}, socketsLeave: () => {} };
const io = { to: () => room, in: () => room };

describe('game authorization', () => {
  let gameState;
  let anna;
  let carlo;

  const call = (handler, playerId, { params = {}, body = {} } = {}) =>
    new Promise((resolve, reject) => {
      const res = {
        status: () => res,
        json: (payload) => {
          resolve(payload.data);
          return res;
        },
      };
      handler(
        { params, body, gameState, io, store: createMemoryStore(), auth: { playerId, role: 'player' } },
        res,
        reject,
      );
    });

  const newGame = async () => {
    const { gameId } = await call(createGame, anna.id, { body: { requiredCredits: 100, maxPlayers: 5 } });
    return gameId;
  };

  const startedGame = async () => {
    const gameId = await newGame();
    await call(joinGame, anna.id, { params: { gameId } });
    await call(joinGame, carlo.id, { params: { gameId } });
    await call(startGame, anna.id, { params: { gameId } });
    return gameId;
  };

  beforeEach(() => {
    gameState = { games: {}, players: {} };
    anna = registerPlayer(gameState, 'Anna');
    carlo = registerPlayer(gameState, 'Carlo');
    buyCredits(gameState, anna.id, 500);
    buyCredits(gameState, carlo.id, 500);
  });

  test('the player in the body is ignored: a game is joined as the token owner', async () => {
    const gameId = await newGame();

    await call(joinGame, carlo.id, { params: { gameId }, body: { playerId: anna.id } });

    expect(gameState.games[gameId].players.map((p) => p.id)).toEqual([carlo.id]);
  });

  test('the player in the body is ignored: leaving affects only the token owner', async () => {
    const gameId = await startedGame();

    await call(leaveGame, carlo.id, { params: { gameId }, body: { playerId: anna.id } });

    expect(gameState.games[gameId].players.map((p) => p.id)).toEqual([anna.id]);
  });

  test('only the creator can start the game', async () => {
    const gameId = await newGame();
    await call(joinGame, anna.id, { params: { gameId } });
    await call(joinGame, carlo.id, { params: { gameId } });

    await expect(call(startGame, carlo.id, { params: { gameId } })).rejects.toMatchObject({ statusCode: 403 });
    expect(gameState.games[gameId].status).toBe('waiting');
  });

  test('only the creator can draw cards', async () => {
    const gameId = await startedGame();

    await expect(call(drawCard, carlo.id, { params: { gameId } })).rejects.toMatchObject({ statusCode: 403 });
    await expect(call(drawCard, anna.id, { params: { gameId } })).resolves.toHaveProperty('carta');
  });

  test('starting twice does not charge the entry fee twice', async () => {
    const gameId = await startedGame();
    expect(anna.credits).toBe(400);

    await expect(call(startGame, anna.id, { params: { gameId } })).rejects.toMatchObject({ statusCode: 400 });

    expect(anna.credits).toBe(400);
  });

  test('a game can be read only by its creator and its players', async () => {
    const gameId = await newGame();
    const outsider = registerPlayer(gameState, 'Outsider');

    await expect(call(getGame, anna.id, { params: { gameId } })).resolves.toMatchObject({ id: gameId });
    await expect(call(getGame, outsider.id, { params: { gameId } })).rejects.toMatchObject({ statusCode: 403 });

    await call(joinGame, carlo.id, { params: { gameId } });
    await expect(call(getGame, carlo.id, { params: { gameId } })).resolves.toMatchObject({ id: gameId });
  });
});
