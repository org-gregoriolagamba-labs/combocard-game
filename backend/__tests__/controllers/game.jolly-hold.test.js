/**
 * Drawing is paused while a player chooses the card for the jolly.
 *
 * The player declares the jolly for a collection; until the jolly is used, cancelled,
 * the player leaves, or the time runs out, nobody can draw and nobody else can start a jolly.
 */

import { jest } from '@jest/globals';
import {
  createGame,
  getGame,
  joinGame,
  startGame,
  drawCard,
  leaveGame,
  useJolly,
  startJollyChoice,
  cancelJollyChoice,
} from '../../src/controllers/game.controller.js';
import { registerPlayer, buyCredits, acceptRules } from '../../src/services/player.service.js';
import { createMemoryStore } from '../../src/db/store.js';
import { GAME_DEFAULTS } from '../../src/config/constants.js';

const card = (valore, seme) => ({ valore, seme, emoji: '', valoreNum: 0 });

describe('jolly hold: no draws while a player chooses the jolly card', () => {
  let gameState;
  let anna;
  let carlo;
  let emitted;
  let io;
  let now;

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
        { params, body, gameState, io, store: createMemoryStore(), auth: { playerId, role: 'player' } },
        res,
        reject,
      );
    });

  const eventsNamed = (event) => emitted.filter((e) => e.event === event);

  const startedGame = async () => {
    const { gameId } = await call(createGame, anna.id, { body: { requiredCredits: 100, maxPlayers: 5 } });
    await call(joinGame, anna.id, { params: { gameId } });
    await call(joinGame, carlo.id, { params: { gameId } });
    await call(startGame, anna.id, { params: { gameId } });
    return { gameId, game: gameState.games[gameId] };
  };

  // Carlo has two covered Asso and a free card that the jolly can turn into the third one
  const prepareTrisFor = (game, playerId) => {
    const player = game.players.find((p) => p.id === playerId);
    player.cartella.forEach((row, r) => row.forEach((c, col) => {
      if (c.valore === 'Asso') player.cartella[r][col] = card('Fante', 'Coppe');
    }));
    player.cartella[0][0] = card('Asso', 'Denari');
    player.cartella[0][1] = card('Asso', 'Coppe');
    player.cartella[0][2] = card('Re', 'Spade');
    player.coperte[0][0] = true;
    player.coperte[0][1] = true;
    player.coperte[0][2] = false;
    return player;
  };

  beforeEach(() => {
    gameState = { games: {}, players: {} };
    anna = registerPlayer(gameState, 'Anna');
    carlo = registerPlayer(gameState, 'Carlo');
    acceptRules(gameState, anna.id);
    acceptRules(gameState, carlo.id);
    buyCredits(gameState, anna.id, 500);
    buyCredits(gameState, carlo.id, 500);
    emitted = [];
    const roomFor = (room) => ({
      emit: (event, data) => emitted.push({ room, event, data: JSON.parse(JSON.stringify(data)) }),
      socketsJoin: () => {},
      socketsLeave: () => {},
    });
    io = { to: roomFor, in: roomFor };
    now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('declaring the jolly', () => {
    test('marks who is choosing, for which collection and until when, and tells the game room', async () => {
      const { gameId, game } = await startedGame();

      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });

      expect(game.jollyInCorso).toEqual({
        playerId: carlo.id,
        name: 'Carlo',
        tipo: 'tris',
        scadenza: now + GAME_DEFAULTS.JOLLY_HOLD_MS,
      });
      const [event] = eventsNamed('jollyInCorso');
      expect(event.room).toBe(gameId);
      expect(event.data).toEqual(game.jollyInCorso);
    });

    test('is part of the view of the game, so a reload still knows', async () => {
      const { gameId } = await startedGame();
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });

      const view = await call(getGame, anna.id, { params: { gameId } });

      expect(view.jollyInCorso).toMatchObject({ playerId: carlo.id, tipo: 'tris' });
    });

    test('declaring again while the own choice runs does not renew the time', async () => {
      const { gameId, game } = await startedGame();
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });
      const scadenza = game.jollyInCorso.scadenza;

      now += 10_000;
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'scopa' } });

      expect(game.jollyInCorso.scadenza).toBe(scadenza);
      expect(eventsNamed('jollyInCorso')).toHaveLength(1);
    });

    test('a player cannot pause the game over and over: the declarations are limited', async () => {
      const { gameId } = await startedGame();

      for (let i = 0; i < GAME_DEFAULTS.JOLLY_MAX_DECLARATIONS; i += 1) {
        await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });
        await call(cancelJollyChoice, carlo.id, { params: { gameId } });
      }

      await expect(
        call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } }),
      ).rejects.toMatchObject({ statusCode: 429 });
      const { carta } = await call(drawCard, anna.id, { params: { gameId } });
      expect(carta).toBeDefined();
    });

    test('is refused when another player is already choosing', async () => {
      const { gameId } = await startedGame();
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });

      await expect(
        call(startJollyChoice, anna.id, { params: { gameId }, body: { tipo: 'scopa' } }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    test('is refused when the jolly is already used', async () => {
      const { gameId, game } = await startedGame();
      game.players.find((p) => p.id === carlo.id).jollyUsato = true;

      await expect(
        call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } }),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(game.jollyInCorso ?? null).toBeNull();
    });

    test('is refused for a collection that has already been won', async () => {
      const { gameId, game } = await startedGame();
      game.collezioni.tris.vinto = true;

      await expect(
        call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test('is refused to someone who is not in the game', async () => {
      const { gameId } = await startedGame();
      const estraneo = registerPlayer(gameState, 'Estraneo');

      await expect(
        call(startJollyChoice, estraneo.id, { params: { gameId }, body: { tipo: 'tris' } }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    test('is refused when the game is not in progress', async () => {
      const { gameId } = await call(createGame, anna.id, { body: { requiredCredits: 100 } });
      await call(joinGame, anna.id, { params: { gameId } });

      await expect(
        call(startJollyChoice, anna.id, { params: { gameId }, body: { tipo: 'tris' } }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('drawing', () => {
    test('is refused while a player chooses the jolly card, with a message that says why', async () => {
      const { gameId, game } = await startedGame();
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });
      const left = game.mazzo.length;

      await expect(call(drawCard, anna.id, { params: { gameId } })).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringMatching(/jolly/i),
      });
      expect(game.mazzo).toHaveLength(left);
      expect(game.carteEstratte).toHaveLength(0);
    });

    test('is refused also when the creator is the one choosing', async () => {
      const { gameId } = await startedGame();
      await call(startJollyChoice, anna.id, { params: { gameId }, body: { tipo: 'tris' } });

      await expect(call(drawCard, anna.id, { params: { gameId } })).rejects.toMatchObject({ statusCode: 409 });
    });

    test('works again after the player cancels, and the room is told', async () => {
      const { gameId } = await startedGame();
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });

      await call(cancelJollyChoice, carlo.id, { params: { gameId } });
      const { carta } = await call(drawCard, anna.id, { params: { gameId } });

      expect(carta).toBeDefined();
      const [event] = eventsNamed('jollyAnnullato');
      expect(event.room).toBe(gameId);
      expect(event.data).toEqual({ playerId: carlo.id });
    });

    test('works again when the time runs out, so the game never stays stuck', async () => {
      const { gameId, game } = await startedGame();
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });

      now += GAME_DEFAULTS.JOLLY_HOLD_MS + 1;
      const { carta } = await call(drawCard, anna.id, { params: { gameId } });

      expect(carta).toBeDefined();
      expect(game.jollyInCorso ?? null).toBeNull();
      expect(eventsNamed('jollyAnnullato')).toHaveLength(1);
    });

    test('is not touched when nobody chose the jolly', async () => {
      const { gameId } = await startedGame();

      const { carta } = await call(drawCard, anna.id, { params: { gameId } });

      expect(carta).toBeDefined();
    });
  });

  describe('ending the choice', () => {
    test('only the player who chose can cancel it', async () => {
      const { gameId, game } = await startedGame();
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });

      await expect(call(cancelJollyChoice, anna.id, { params: { gameId } })).rejects.toMatchObject({ statusCode: 403 });
      expect(game.jollyInCorso).not.toBeNull();
    });

    test('someone who is not in the game cannot cancel, nor learn that a choice is running', async () => {
      const { gameId } = await startedGame();
      const estraneo = registerPlayer(gameState, 'Estraneo');

      await expect(call(cancelJollyChoice, estraneo.id, { params: { gameId } })).rejects.toMatchObject({ statusCode: 404 });
    });

    test('the jolly cannot be used once the game is over', async () => {
      const { gameId, game } = await startedGame();
      prepareTrisFor(game, carlo.id);
      game.status = 'finished';

      await expect(
        call(useJolly, carlo.id, { params: { gameId }, body: { row: 0, col: 2, tipo: 'tris' } }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test('a choice that has run out of time is not shown by the view of the game', async () => {
      const { gameId } = await startedGame();
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });

      now += GAME_DEFAULTS.JOLLY_HOLD_MS + 1;
      const view = await call(getGame, anna.id, { params: { gameId } });

      expect(view.jollyInCorso ?? null).toBeNull();
    });

    test('cancelling when nobody is choosing does nothing', async () => {
      const { gameId } = await startedGame();

      await expect(call(cancelJollyChoice, carlo.id, { params: { gameId } })).resolves.toEqual({ success: true });
      expect(eventsNamed('jollyAnnullato')).toHaveLength(0);
    });

    test('using the jolly ends it by itself', async () => {
      const { gameId, game } = await startedGame();
      prepareTrisFor(game, carlo.id);
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });

      await call(useJolly, carlo.id, { params: { gameId }, body: { row: 0, col: 2, tipo: 'tris' } });

      expect(game.jollyInCorso ?? null).toBeNull();
      const { carta } = await call(drawCard, anna.id, { params: { gameId } });
      expect(carta).toBeDefined();
    });

    test('another player cannot use the jolly while someone else is choosing', async () => {
      const { gameId, game } = await startedGame();
      prepareTrisFor(game, anna.id);
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });

      await expect(
        call(useJolly, anna.id, { params: { gameId }, body: { row: 0, col: 2, tipo: 'tris' } }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(game.players.find((p) => p.id === anna.id).jollyUsato).toBe(false);
    });

    test('the jolly cannot be used on a card that is already covered', async () => {
      const { gameId, game } = await startedGame();
      prepareTrisFor(game, carlo.id);
      const carlosGame = game.players.find((p) => p.id === carlo.id);
      carlosGame.coperte[0][2] = true;

      await expect(
        call(useJolly, carlo.id, { params: { gameId }, body: { row: 0, col: 2, tipo: 'tris' } }),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(carlosGame.jollyUsato).toBe(false);
    });

    test('the jolly can still be used without declaring it first, when nobody else is choosing', async () => {
      const { gameId, game } = await startedGame();
      prepareTrisFor(game, carlo.id);

      const result = await call(useJolly, carlo.id, { params: { gameId }, body: { row: 0, col: 2, tipo: 'tris' } });

      expect(result.success).toBe(true);
    });

    test('leaving the game ends the choice of whoever leaves', async () => {
      const { gameId, game } = await startedGame();
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });

      await call(leaveGame, carlo.id, { params: { gameId } });

      expect(game.jollyInCorso ?? null).toBeNull();
      expect(eventsNamed('jollyAnnullato')).toHaveLength(1);
    });

    test('leaving the game does not end the choice of somebody else', async () => {
      const { gameId, game } = await startedGame();
      await call(startJollyChoice, carlo.id, { params: { gameId }, body: { tipo: 'tris' } });

      await call(leaveGame, anna.id, { params: { gameId } });

      expect(game.jollyInCorso).toMatchObject({ playerId: carlo.id });
    });
  });
});
