/**
 * Sounds of a game
 *
 * The creator chooses whether the game has sounds; without a choice it has them, and every
 * player sees the choice in the game they read.
 */

import { createGame, getGame } from '../../src/controllers/game.controller.js';
import { registerPlayer, buyCredits, acceptRules } from '../../src/services/player.service.js';
import { createMemoryStore } from '../../src/db/store.js';
import { createGameSchema } from '../../src/validation/schemas.js';

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

describe('the sounds of a game', () => {
  let gameState;
  let anna;

  beforeEach(() => {
    gameState = { games: {}, players: {} };
    anna = registerPlayer(gameState, 'Anna');
    acceptRules(gameState, anna.id);
    buyCredits(gameState, anna.id, 300);
  });

  const create = async (body) => {
    const { gameId } = await call(createGame, gameState, { playerId: anna.id, body: { requiredCredits: 100, ...body } });
    return gameState.games[gameId];
  };

  test('a game has sounds unless the creator turns them off', async () => {
    expect((await create({})).soundsEnabled).toBe(true);
  });

  test('the creator can turn them off', async () => {
    expect((await create({ soundsEnabled: false })).soundsEnabled).toBe(false);
  });

  test('the creator can turn them on explicitly', async () => {
    expect((await create({ soundsEnabled: true })).soundsEnabled).toBe(true);
  });

  test('the game that is read says it', async () => {
    const game = await create({ soundsEnabled: false });

    const view = await call(getGame, gameState, { params: { gameId: game.id }, playerId: anna.id });
    expect((view.game ?? view).soundsEnabled).toBe(false);
  });
});

describe('createGameSchema and the sounds', () => {
  test('accepts a boolean', () => {
    expect(createGameSchema.validate({ soundsEnabled: false }).error).toBeUndefined();
  });

  test.each([['yes'], ['false'], [0], [null]])('rejects %j', (value) => {
    expect(createGameSchema.validate({ soundsEnabled: value }).error).toBeDefined();
  });
});
