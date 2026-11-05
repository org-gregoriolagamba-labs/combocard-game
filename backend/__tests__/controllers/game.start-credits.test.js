/**
 * Entry fee at the start of a game
 *
 * The credits are checked again when the fee is charged: a balance never goes below zero.
 */

import { createGame, joinGame, startGame } from '../../src/controllers/game.controller.js';
import { registerPlayer, buyCredits, acceptRules } from '../../src/services/player.service.js';
import { createMemoryStore } from '../../src/db/store.js';

const room = { emit: () => {}, socketsJoin: () => {}, socketsLeave: () => {} };
const io = { to: () => room, in: () => room };

function call(handler, gameState, { params = {}, body = {}, playerId }) {
  return new Promise((resolve, reject) => {
    const res = {
      status: () => res,
      json: (payload) => {
        resolve(payload.data);
        return res;
      },
    };
    handler({ params, body, gameState, io, store: createMemoryStore(), auth: { playerId } }, res, reject);
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('the entry fee at the start', () => {
  let gameState;
  let anna;
  let carlo;

  const newPlayer = (name) => {
    const player = registerPlayer(gameState, name);
    acceptRules(gameState, player.id);
    buyCredits(gameState, player.id, 300);
    return player;
  };

  const waitingGame = async (maxPlayers) => {
    const { gameId } = await call(createGame, gameState, {
      playerId: anna.id,
      body: { requiredCredits: 100, maxPlayers },
    });
    await call(joinGame, gameState, { params: { gameId }, playerId: anna.id });
    return gameState.games[gameId];
  };

  beforeEach(() => {
    gameState = { games: {}, players: {} };
    anna = newPlayer('Anna');
    carlo = newPlayer('Carlo');
  });

  test('the creator starts a game: everybody pays the fee once', async () => {
    const game = await waitingGame(4);
    await call(joinGame, gameState, { params: { gameId: game.id }, playerId: carlo.id });

    await call(startGame, gameState, { params: { gameId: game.id }, playerId: anna.id });

    expect([anna.credits, carlo.credits]).toEqual([200, 200]);
    expect(game.montepremi).toBe(200);
  });

  test('a player who no longer has the fee stops the start, and nobody is charged', async () => {
    const game = await waitingGame(4);
    await call(joinGame, gameState, { params: { gameId: game.id }, playerId: carlo.id });
    carlo.credits = 50;

    await expect(call(startGame, gameState, { params: { gameId: game.id }, playerId: anna.id }))
      .rejects.toMatchObject({ statusCode: 400, message: 'A player does not have enough credits to start' });

    expect(game.status).toBe('waiting');
    expect(game.montepremi ?? 0).toBe(0);
    expect([anna.credits, carlo.credits]).toEqual([300, 50]);
  });

  test('a full game starts by itself and charges everybody', async () => {
    const game = await waitingGame(2);

    await call(joinGame, gameState, { params: { gameId: game.id }, playerId: carlo.id });
    await wait(250);

    expect(game.status).toBe('playing');
    expect([anna.credits, carlo.credits]).toEqual([200, 200]);
  });

  test('a full game does not start by itself when a player no longer has the fee, and nobody is charged', async () => {
    const game = await waitingGame(2);

    await call(joinGame, gameState, { params: { gameId: game.id }, playerId: carlo.id });
    carlo.credits = 50;
    await wait(250);

    expect(game.status).toBe('waiting');
    expect([anna.credits, carlo.credits]).toEqual([300, 50]);
  });
});
