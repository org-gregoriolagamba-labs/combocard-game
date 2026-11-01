/**
 * Persistence Service Tests
 */

import { jest } from '@jest/globals';
import {
  CREDIT_MOVEMENT,
  trackCredits,
  saveGameSafely,
  deleteGameSafely,
} from '../../src/services/persistence.service.js';

describe('trackCredits', () => {
  const setup = () => ({
    gameState: {
      players: {
        a: { id: 'a', credits: 500 },
        b: { id: 'b', credits: 300 },
      },
    },
    game: { id: 'g1', players: [{ id: 'a' }, { id: 'b' }] },
  });

  test('returns one movement per player whose credits changed', () => {
    const { gameState, game } = setup();
    const movements = trackCredits(gameState, game);

    gameState.players.a.credits -= 100;

    expect(movements(CREDIT_MOVEMENT.GAME_ENTRY)).toEqual([
      { playerId: 'a', gameId: 'g1', type: 'game_entry', amount: -100 },
    ]);
  });

  test('still sees a player who left the game after tracking started', () => {
    const { gameState, game } = setup();
    const movements = trackCredits(gameState, game);

    gameState.players.b.credits += 40;
    game.players = game.players.filter((p) => p.id !== 'b');

    expect(movements(CREDIT_MOVEMENT.GAME_PAYOUT)).toEqual([
      { playerId: 'b', gameId: 'g1', type: 'game_payout', amount: 40 },
    ]);
  });

  test('ignores game players with no account', () => {
    const { gameState, game } = setup();
    game.players.push({ id: 'ghost' });

    expect(trackCredits(gameState, game)(CREDIT_MOVEMENT.GAME_PAYOUT)).toEqual([]);
  });
});

describe('safe writes', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test('saveGameSafely passes the data on', async () => {
    const store = { saveGame: jest.fn(async () => {}) };
    const game = { id: 'g1' };
    const movements = [{ amount: 1 }];

    await saveGameSafely(store, game, movements);

    expect(store.saveGame).toHaveBeenCalledWith(game, movements);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('saveGameSafely logs a failure instead of throwing', async () => {
    const store = { saveGame: jest.fn(async () => { throw new Error('down'); }) };

    await expect(saveGameSafely(store, { id: 'g1' })).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  test('deleteGameSafely logs a failure instead of throwing', async () => {
    const store = { deleteGame: jest.fn(async () => { throw new Error('down'); }) };

    await expect(deleteGameSafely(store, 'g1')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
