/**
 * Game Visibility Tests
 *
 * A client receives only what its player can see: never the deck, and never
 * the grid of another player. Every HTTP response and socket event is covered.
 */

import { jest } from '@jest/globals';
import {
  createGame,
  getGame,
  joinGame,
  startGame,
  drawCard,
  claimCollection,
  useJolly,
} from '../../src/controllers/game.controller.js';
import { registerPlayer, buyCredits } from '../../src/services/player.service.js';
import { createMemoryStore } from '../../src/db/store.js';
import { playerRoom } from '../../src/sockets/index.js';

const PUBLIC_PLAYER_FIELDS = ['collezioni', 'gettoni', 'id', 'jollyUsato', 'name'];

const card = (valore, seme) => ({ valore, seme, emoji: '', valoreNum: 0 });

describe('game visibility', () => {
  let gameState;
  let anna;
  let carlo;
  let emitted;
  let io;

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

  const newGame = async ({ maxPlayers = 5 } = {}) => {
    const { gameId } = await call(createGame, anna.id, { body: { requiredCredits: 100, maxPlayers } });
    await call(joinGame, anna.id, { params: { gameId } });
    await call(joinGame, carlo.id, { params: { gameId } });
    return gameId;
  };

  const startedGame = async () => {
    const gameId = await newGame();
    await call(startGame, anna.id, { params: { gameId } });
    return { gameId, game: gameState.games[gameId] };
  };

  const expectPlayerHidden = (player) => {
    expect(Object.keys(player).sort()).toEqual(PUBLIC_PLAYER_FIELDS);
  };

  beforeEach(() => {
    gameState = { games: {}, players: {} };
    anna = registerPlayer(gameState, 'Anna');
    carlo = registerPlayer(gameState, 'Carlo');
    buyCredits(gameState, anna.id, 500);
    buyCredits(gameState, carlo.id, 500);

    emitted = [];
    const roomFor = (room) => ({
      emit: (event, data) => emitted.push({ room, event, data: JSON.parse(JSON.stringify(data)) }),
      socketsJoin: () => {},
      socketsLeave: () => {},
    });
    io = { to: roomFor, in: roomFor };
  });

  describe('HTTP responses', () => {
    test('creating a game does not return the deck', async () => {
      const { game } = await call(createGame, anna.id, { body: { requiredCredits: 100 } });

      expect(game).not.toHaveProperty('mazzo');
      expect(game.carteRimaste).toBe(0);
    });

    test('reading a game hides the deck and shows how many cards are left', async () => {
      const { gameId } = await startedGame();

      const game = await call(getGame, carlo.id, { params: { gameId } });

      expect(game).not.toHaveProperty('mazzo');
      expect(game.carteRimaste).toBe(40);
    });

    test('reading a game shows the own grid and hides the others', async () => {
      const { gameId, game: stored } = await startedGame();

      const game = await call(getGame, carlo.id, { params: { gameId } });

      const own = game.players.find((p) => p.id === carlo.id);
      expect(own.cartella).toEqual(stored.players.find((p) => p.id === carlo.id).cartella);
      expect(own.coperte).toHaveLength(5);
      expectPlayerHidden(game.players.find((p) => p.id === anna.id));
    });

    test('starting a game returns the view of the creator', async () => {
      const gameId = await newGame();

      const { game } = await call(startGame, anna.id, { params: { gameId } });

      expect(game).not.toHaveProperty('mazzo');
      expect(game.carteRimaste).toBe(40);
      expect(game.players.find((p) => p.id === anna.id).cartella).toHaveLength(5);
      expectPlayerHidden(game.players.find((p) => p.id === carlo.id));
    });

    test('the count of the remaining cards goes down at each draw', async () => {
      const { gameId } = await startedGame();

      await call(drawCard, anna.id, { params: { gameId } });

      const game = await call(getGame, carlo.id, { params: { gameId } });
      expect(game.carteRimaste).toBe(39);
      expect(game.carteEstratte).toHaveLength(1);
    });

    test('hiding the deck does not change the state to persist', async () => {
      const { gameId, game: stored } = await startedGame();

      await call(getGame, carlo.id, { params: { gameId } });

      expect(stored.mazzo).toHaveLength(40);
      expect(stored.players.every((p) => p.cartella.length === 5)).toBe(true);
    });
  });

  describe('gameStarted event', () => {
    const expectPersonalEvents = (gameId) => {
      const events = eventsNamed('gameStarted');
      expect(events.some((e) => e.room === gameId)).toBe(false);

      for (const [player, other] of [[anna, carlo], [carlo, anna]]) {
        const event = events.find((e) => e.room === playerRoom(player.id));
        expect(event.data.game).not.toHaveProperty('mazzo');
        expect(event.data.game.carteRimaste).toBe(40);
        expect(event.data.game.players.find((p) => p.id === player.id).cartella).toHaveLength(5);
        expectPlayerHidden(event.data.game.players.find((p) => p.id === other.id));
      }
    };

    test('each player receives their own view when the creator starts the game', async () => {
      const gameId = await newGame();

      await call(startGame, anna.id, { params: { gameId } });

      expectPersonalEvents(gameId);
    });

    test('each player receives their own view when the game starts automatically', async () => {
      jest.useFakeTimers();
      try {
        const gameId = await newGame({ maxPlayers: 2 });

        await jest.advanceTimersByTimeAsync(150);

        expect(gameState.games[gameId].status).toBe('playing');
        expectPersonalEvents(gameId);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('events during the game', () => {
    test('a covered card is notified only to the owner of the grid', async () => {
      const { gameId, game } = await startedGame();
      const annaInGame = game.players.find((p) => p.id === anna.id);
      game.mazzo.push(annaInGame.cartella[0][0]);

      await call(drawCard, anna.id, { params: { gameId } });

      const events = eventsNamed('cardCovered');
      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.room === gameId)).toBe(false);
      expect(events.find((e) => e.data.playerId === anna.id).room).toBe(playerRoom(anna.id));
    });

    test('a drawn card is still notified to the whole game', async () => {
      const { gameId } = await startedGame();

      const { carta } = await call(drawCard, anna.id, { params: { gameId } });

      expect(eventsNamed('cardDrawn')).toEqual([
        { room: gameId, event: 'cardDrawn', data: { carta } },
      ]);
    });

    const prepareTris = (game) => {
      const player = game.players.find((p) => p.id === anna.id);
      player.cartella[0][0] = card('Asso', 'Denari');
      player.cartella[0][1] = card('Asso', 'Coppe');
      player.cartella[0][2] = card('Asso', 'Spade');
      player.coperte[0][0] = true;
      player.coperte[0][1] = true;
      return player;
    };

    test('a collection won automatically does not reveal the grid of the winner', async () => {
      const { gameId, game } = await startedGame();
      const player = prepareTris(game);
      game.mazzo.push(player.cartella[0][2]);

      await call(drawCard, anna.id, { params: { gameId } });

      const [event] = eventsNamed('collezioneVinta');
      expect(event.data.vincitori).toEqual([{ id: anna.id, name: 'Anna' }]);
      expect(event.data).not.toHaveProperty('players');
    });

    test('a collection claimed by hand does not reveal the grid of the winner', async () => {
      const { gameId, game } = await startedGame();
      const player = prepareTris(game);
      player.coperte[0][2] = true;

      await call(claimCollection, anna.id, { params: { gameId }, body: { tipo: 'tris' } });

      const [event] = eventsNamed('collezioneVinta');
      expect(event.data.vincitori).toEqual([{ id: anna.id, name: 'Anna' }]);
      expect(event.data).not.toHaveProperty('players');
    });

    test('using the jolly tells the others only that it was used', async () => {
      const { gameId, game } = await startedGame();
      const player = prepareTris(game);
      player.cartella[0][2] = card('Re', 'Spade');
      // The jolly cannot become a card that is already in the grid
      player.cartella.forEach((row, r) => row.forEach((c, col) => {
        if (r > 0 && c.valore === 'Asso' && c.seme === 'Spade') {
          player.cartella[r][col] = card('Fante', 'Coppe');
        }
      }));

      const { newCard } = await call(useJolly, anna.id, {
        params: { gameId },
        body: { row: 0, col: 2, tipo: 'tris' },
      });

      expect(newCard.valore).toBe('Asso');
      const [event] = eventsNamed('jollyUsato');
      expect(event.room).toBe(gameId);
      expect(event.data).toEqual({ playerId: anna.id, tipo: 'tris' });
      expect(eventsNamed('cardCovered').some((e) => e.room === gameId)).toBe(false);
    });
  });
});
