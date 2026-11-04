/**
 * Join Tests
 *
 * A game accepts new players only while it waits for them. Once started, the entry fees are
 * charged and the prizes fixed: a late player would pay nothing and share the prizes.
 */

import { createGame, joinGame, startGame, leaveGame } from '../../src/controllers/game.controller.js';
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

describe('joining a game', () => {
  let gameState;
  let anna;
  let carlo;
  let late;

  const newPlayer = (name, credits = 300) => {
    const player = registerPlayer(gameState, name);
    acceptRules(gameState, player.id);
    buyCredits(gameState, player.id, credits);
    return player;
  };

  const join = (player, gameId) => call(joinGame, gameState, { params: { gameId }, playerId: player.id });

  const waitingGame = async (maxPlayers = 4) => {
    const { gameId } = await call(createGame, gameState, {
      playerId: anna.id,
      body: { requiredCredits: 100, maxPlayers },
    });
    await join(anna, gameId);
    await join(carlo, gameId);
    return gameState.games[gameId];
  };

  const startedGame = async (maxPlayers = 4) => {
    const game = await waitingGame(maxPlayers);
    await call(startGame, gameState, { params: { gameId: game.id }, playerId: anna.id });
    return game;
  };

  beforeEach(() => {
    gameState = { games: {}, players: {} };
    anna = newPlayer('Anna');
    carlo = newPlayer('Carlo');
    late = newPlayer('Late');
  });

  test('a player joins a game that is waiting', async () => {
    const game = await waitingGame();

    await join(late, game.id);

    expect(game.players.map((p) => p.id)).toContain(late.id);
    expect(late.currentGameId).toBe(game.id);
  });

  test('a new player cannot join a game already started, even with seats free', async () => {
    const game = await startedGame(4);

    await expect(join(late, game.id)).rejects.toMatchObject({ statusCode: 400, message: 'Game already started' });

    expect(game.players.map((p) => p.id)).not.toContain(late.id);
    expect(game.players).toHaveLength(2);
    expect(late.credits).toBe(300);
    expect(late.currentGameId ?? null).toBeNull();
  });

  test('a new player cannot join a game that is finished', async () => {
    const game = await startedGame();
    game.status = 'finished';

    await expect(join(late, game.id)).rejects.toMatchObject({ statusCode: 400, message: 'Game already started' });
  });

  test('a player already in a game started gets the same answer again, and keeps the same grid', async () => {
    const game = await startedGame(4);
    const before = JSON.stringify(game.players.find((p) => p.id === carlo.id).cartella);

    const answer = await join(carlo, game.id);

    expect(answer).toMatchObject({ success: true, autoStarted: true });
    expect(game.players).toHaveLength(2);
    expect(JSON.stringify(game.players.find((p) => p.id === carlo.id).cartella)).toBe(before);
  });

  test('a player already in a game that started by itself because it was full is told so, not "full"', async () => {
    const game = await waitingGame(2);
    game.status = 'playing';

    await expect(join(carlo, game.id)).resolves.toMatchObject({ success: true, autoStarted: true });
  });

  test('a player who leaves a game started cannot come back for a new grid', async () => {
    const game = await startedGame(4);
    await call(leaveGame, gameState, { params: { gameId: game.id }, playerId: carlo.id });

    await expect(join(carlo, game.id)).rejects.toMatchObject({ statusCode: 400, message: 'Game already started' });

    expect(game.players.map((p) => p.id)).not.toContain(carlo.id);
  });

  test('a player already in a game that is waiting is told so', async () => {
    const game = await waitingGame();

    await expect(join(carlo, game.id)).rejects.toMatchObject({ statusCode: 400, message: 'Already in game' });
  });

  test('a game that is waiting and full is full', async () => {
    const game = await waitingGame(2);

    await expect(join(late, game.id)).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/full/i) });
  });
});
