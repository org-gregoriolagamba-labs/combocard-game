/**
 * Credit Settlement Tests
 *
 * Run the game controllers on an in-memory state to check that a game only
 * changes a player's credits by what was won or paid in that game.
 */

import {
  createGame,
  joinGame,
  startGame,
  leaveGame,
} from '../../src/controllers/game.controller.js';
import { finishGame } from '../../src/services/game.service.js';
import { registerPlayer, buyCredits } from '../../src/services/player.service.js';
import { createMemoryStore } from '../../src/db/store.js';

const io = { to: () => ({ emit: () => {} }) };

function call(handler, gameState, { params = {}, body = {} }) {
  return new Promise((resolve, reject) => {
    const res = {
      status: () => res,
      json: (payload) => {
        resolve(payload.data);
        return res;
      },
    };
    handler({ params, body, gameState, io, store: createMemoryStore() }, res, reject);
  });
}

describe('credit settlement', () => {
  let gameState;
  let anna;
  let carlo;

  const newStartedGame = async (requiredCredits = 100) => {
    const { gameId } = await call(createGame, gameState, {
      body: { playerId: anna.id, requiredCredits, maxPlayers: 5 },
    });
    await call(joinGame, gameState, { params: { gameId }, body: { playerId: anna.id } });
    await call(joinGame, gameState, { params: { gameId }, body: { playerId: carlo.id } });
    await call(startGame, gameState, { params: { gameId }, body: { playerId: anna.id } });
    return gameState.games[gameId];
  };

  beforeEach(() => {
    gameState = { games: {}, players: {} };
    anna = registerPlayer(gameState, 'Anna');
    carlo = registerPlayer(gameState, 'Carlo');
    buyCredits(gameState, anna.id, 500);
    buyCredits(gameState, carlo.id, 300);
  });

  test('credits bought during a game survive the end of the game', async () => {
    const game = await newStartedGame();
    buyCredits(gameState, anna.id, 50);
    game.collezioniDistribuzione = { tris: 100, sequenza: 0, scopa: 0, napola: 0, combocard_reale: 0 };

    finishGame(game, game.id, io, gameState);

    // 500 - 100 entry + 50 purchase + 50 share of the unclaimed prize
    expect(anna.credits).toBe(500);
    expect(carlo.credits).toBe(250);
  });

  test('credits bought during a game survive leaving it', async () => {
    const game = await newStartedGame();
    buyCredits(gameState, anna.id, 50);

    await call(leaveGame, gameState, {
      params: { gameId: game.id },
      body: { playerId: anna.id },
    });

    expect(anna.credits).toBe(450);
  });

  test('prizes won are paid once when leaving', async () => {
    const game = await newStartedGame();
    game.players.find((p) => p.id === anna.id).gettoni += 30;

    await call(leaveGame, gameState, {
      params: { gameId: game.id },
      body: { playerId: anna.id },
    });

    expect(anna.credits).toBe(430);
    expect(game.players.some((p) => p.id === anna.id)).toBe(false);
  });

  test('finishing one game does not undo another game of the same player', async () => {
    const first = await newStartedGame(100);
    const second = await newStartedGame(50);
    expect(anna.credits).toBe(350);

    first.collezioniDistribuzione = { tris: 0, sequenza: 0, scopa: 0, napola: 0, combocard_reale: 0 };
    finishGame(first, first.id, io, gameState);

    expect(anna.credits).toBe(350);
    expect(second.status).toBe('playing');
  });

  test('a player who joins a game already started keeps their credits', async () => {
    const game = await newStartedGame();
    const late = registerPlayer(gameState, 'Late');
    buyCredits(gameState, late.id, 200);
    await call(joinGame, gameState, { params: { gameId: game.id }, body: { playerId: late.id } });
    game.collezioniDistribuzione = { tris: 0, sequenza: 0, scopa: 0, napola: 0, combocard_reale: 0 };

    finishGame(game, game.id, io, gameState);

    expect(late.credits).toBe(200);
  });
});
