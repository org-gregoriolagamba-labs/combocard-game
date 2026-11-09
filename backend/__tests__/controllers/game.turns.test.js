/**
 * Drawing by turns
 *
 * With `estrazione: "tutti"` the server picks who draws each card: every player in turn, in a
 * shuffled round, so nobody is left out. The one whose turn it is has a time limit; if it runs
 * out the card is drawn by itself and the player gets a yellow card, a red one the second time,
 * and a player with a red card no longer draws. The creator has no privilege in this mode.
 */

import { jest } from '@jest/globals';
import {
  createGame,
  getGame,
  joinGame,
  startGame,
  drawCard,
  leaveGame,
  startJollyChoice,
  cancelJollyChoice,
} from '../../src/controllers/game.controller.js';
import { riarmaTurni } from '../../src/services/estrazione.service.js';
import { registerPlayer, buyCredits, acceptRules } from '../../src/services/player.service.js';
import { createMemoryStore } from '../../src/db/store.js';
import config from '../../src/config/index.js';
import { playerRoom } from '../../src/sockets/index.js';

const COOLDOWN = config.drawCooldownSeconds * 1000;
const TURNO = config.drawTurnSeconds * 1000;

describe('drawing by turns', () => {
  let gameState;
  let players;
  let emitted;
  let online;
  let io;
  const store = createMemoryStore();

  const call = (handler, playerId, { params = {}, body = {} } = {}) =>
    new Promise((resolve, reject) => {
      const res = {
        status: () => res,
        json: (payload) => {
          resolve(JSON.parse(JSON.stringify(payload.data)));
          return res;
        },
      };
      handler({ params, body, gameState, io, store, auth: { playerId, role: 'player' } }, res, reject);
    });

  const eventsNamed = (event) => emitted.filter((e) => e.event === event).map((e) => e.payload);
  const avanza = (ms) => jest.advanceTimersByTimeAsync(ms);

  const newGame = async (names, body = { estrazione: 'tutti' }) => {
    players = names.map((n) => {
      const p = registerPlayer(gameState, n);
      acceptRules(gameState, p.id);
      buyCredits(gameState, p.id, 500);
      online.add(p.id);
      return p;
    });
    const { gameId } = await call(createGame, players[0].id, { body: { requiredCredits: 100, maxPlayers: 10, ...body } });
    for (const p of players) await call(joinGame, p.id, { params: { gameId } });
    await call(startGame, players[0].id, { params: { gameId } });
    return { gameId, game: gameState.games[gameId] };
  };

  const byId = (id) => players.find((p) => p.id === id);
  const draw = (id, gameId) => call(drawCard, id, { params: { gameId } });

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-01-01T10:00:00Z') });
    gameState = { games: {}, players: {} };
    emitted = [];
    online = new Set();
    const room = (name) => ({ emit: (event, payload) => emitted.push({ room: name, event, payload }) });
    io = {
      to: room,
      in: () => ({ socketsJoin: () => {}, socketsLeave: () => {} }),
      sockets: { adapter: { rooms: { get: (name) => (online.has(name.replace(/^player:/, '')) ? new Set(['s']) : undefined) } } },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the choice at the creation', () => {
    test('a game made without the choice is drawn by its creator, as before', async () => {
      const { game } = await newGame(['Anna', 'Carlo'], {});

      expect(game.estrazione).toBe('creatore');
      expect(game.turno ?? null).toBeNull();
    });

    test('the creator can ask for the turns', async () => {
      const { game } = await newGame(['Anna', 'Carlo']);

      expect(game.estrazione).toBe('tutti');
      expect(game.turno.playerId).toEqual(expect.any(String));
    });
  });

  describe('whose turn it is', () => {
    test('only the player of the turn draws, and not the creator by privilege', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo', 'Dora']);
      const other = players.find((p) => p.id !== game.turno.playerId && p.id !== players[0].id) ?? players.find((p) => p.id !== game.turno.playerId);

      await avanza(COOLDOWN);

      await expect(draw(other.id, gameId)).rejects.toMatchObject({ statusCode: 403 });
      const result = await draw(game.turno.playerId, gameId);
      expect(result.carta).toBeDefined();
    });

    test('the creator who is not on turn is refused too', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo']);
      const creatorIsOnTurn = game.turno.playerId === players[0].id;
      await avanza(COOLDOWN);

      if (!creatorIsOnTurn) {
        await expect(draw(players[0].id, gameId)).rejects.toMatchObject({ statusCode: 403 });
      }
      await draw(game.turno.playerId, gameId);
      const next = game.turno.playerId;
      await avanza(COOLDOWN);
      if (next !== players[0].id) {
        await expect(draw(players[0].id, gameId)).rejects.toMatchObject({ statusCode: 403 });
      }
    });

    test('the wait between draws is kept by the server: too soon is refused with 409', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo']);

      await expect(draw(game.turno.playerId, gameId)).rejects.toMatchObject({ statusCode: 409 });
      await avanza(COOLDOWN - 1);
      await expect(draw(game.turno.playerId, gameId)).rejects.toMatchObject({ statusCode: 409 });
      await avanza(1);
      await expect(draw(game.turno.playerId, gameId)).resolves.toBeDefined();
    });

    test('a round is shuffled but gives every player one turn before anyone has a second', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo', 'Dora', 'Elia']);
      const seen = [];

      for (let i = 0; i < 4; i++) {
        await avanza(COOLDOWN);
        seen.push(game.turno.playerId);
        await draw(game.turno.playerId, gameId);
      }

      expect(new Set(seen).size).toBe(4);
    });

    test('the next turn begins at once, with the wait and the time limit', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo']);
      await avanza(COOLDOWN);
      await draw(game.turno.playerId, gameId);

      const turns = eventsNamed('turnoEstrazione');
      expect(turns.at(-1)).toMatchObject({ playerId: game.turno.playerId, attesaIn: COOLDOWN, scadenzaIn: TURNO });
    });

    test('the game that is read tells the turn in relative times, and keeps the round to itself', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo']);
      await avanza(10_000);

      const view = await call(getGame, players[0].id, { params: { gameId } });
      const g = view.game ?? view;

      expect(g.turno).toMatchObject({ playerId: game.turno.playerId, attesaIn: 0, scadenzaIn: TURNO - 10_000 });
      expect(g.codaEstrattori).toBeUndefined();
      expect(g.ultimoEstrattore).toBeUndefined();
      expect(g.mazzo).toBeUndefined();
    });
  });

  describe('the time limit, the yellow and the red card', () => {
    test('when the time runs out the card is drawn by itself and the player gets a yellow card', async () => {
      const { game } = await newGame(['Anna', 'Carlo']);
      const late = game.turno.playerId;

      await avanza(TURNO);

      expect(game.carteEstratte).toHaveLength(1);
      expect(byId(late) && game.players.find((p) => p.id === late).ammonizioni).toBe(1);
      expect(eventsNamed('ammonizione')).toEqual([expect.objectContaining({ playerId: late, colore: 'gialla', ammonizioni: 1 })]);
    });

    test('the player who draws in time gets nothing', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo']);
      const first = game.turno.playerId;
      await avanza(COOLDOWN);
      await draw(first, gameId);
      await avanza(TURNO);

      expect(game.players.find((p) => p.id === first).ammonizioni ?? 0).toBe(0);
    });

    test('the second time is a red card: the player no longer draws, and is told so', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo', 'Dora']);
      const late = game.turno.playerId;
      const stats = () => game.players.find((p) => p.id === late);

      // Everybody draws in time except one player, who lets the time run out at each of their turns
      for (let i = 0; i < 12 && !stats().espulso; i++) {
        if (game.turno.playerId === late) {
          await avanza(TURNO);
        } else {
          await avanza(COOLDOWN);
          await draw(game.turno.playerId, gameId);
        }
      }

      expect(stats().ammonizioni).toBe(2);
      expect(stats().espulso).toBe(true);
      expect(eventsNamed('ammonizione').map((e) => `${e.playerId}:${e.colore}`)).toEqual([`${late}:gialla`, `${late}:rossa`]);

      // Never on turn again
      for (let i = 0; i < 6; i++) {
        await avanza(COOLDOWN);
        expect(game.turno.playerId).not.toBe(late);
        await draw(game.turno.playerId, gameId);
      }
    });

    test('a player with a red card who tries to draw is refused', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo']);
      const stats = game.players[0];
      stats.espulso = true;
      stats.ammonizioni = 2;

      await expect(draw(stats.id, gameId)).rejects.toMatchObject({ statusCode: 403 });
    });

    test('the red card is seen by everybody, the yellow count too', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo', 'Dora']);
      const late = game.turno.playerId;
      await avanza(TURNO);

      const watcher = players.find((p) => p.id !== late);
      const view = await call(getGame, watcher.id, { params: { gameId } });
      const g = view.game ?? view;

      expect(g.players.find((p) => p.id === late).ammonizioni).toBe(1);
    });

    test('if nobody can draw any more the server draws by itself after the wait', async () => {
      const { game } = await newGame(['Anna', 'Carlo']);
      game.players.forEach((p) => {
        p.espulso = true;
        p.ammonizioni = 2;
      });
      await avanza(TURNO);
      const before = game.carteEstratte.length;

      await avanza(COOLDOWN + 1);

      expect(game.carteEstratte.length).toBeGreaterThan(before);
    });

    test('the limit is a setting of the server: 60 seconds by default', () => {
      expect(config.drawTurnSeconds).toBe(60);
    });
  });

  describe('the pause of the jolly', () => {
    test('the time limit stops while the jolly is chosen, and goes on after it', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo']);
      const holder = players.find((p) => p.id !== game.turno.playerId);

      await avanza(10_000);
      await call(startJollyChoice, holder.id, { params: { gameId }, body: { tipo: 'tris' } });
      await avanza(25_000);
      await call(cancelJollyChoice, holder.id, { params: { gameId } });

      // Only the 10 s before the declaration were counted: 50 of the 60 s are left
      await avanza(TURNO - 10_000 - 1_000);
      expect(game.carteEstratte).toHaveLength(0);
      await avanza(2_000);
      expect(game.carteEstratte).toHaveLength(1);
    });
  });

  describe('who leaves and who is away', () => {
    test('if the player on turn leaves, another one takes the turn', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo', 'Dora']);
      const leaving = game.turno.playerId;

      await call(leaveGame, leaving, { params: { gameId } });

      expect(game.turno.playerId).not.toBe(leaving);
      expect(game.players.map((p) => p.id)).toContain(game.turno.playerId);
    });

    test('a player who is not connected is skipped', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo', 'Dora']);
      const away = players[2];
      // The first turn was given before the player went away
      await avanza(COOLDOWN);
      await draw(game.turno.playerId, gameId);
      online.delete(away.id);
      // The turn that was already given may be theirs: it goes by, the ones after it are not
      await avanza(COOLDOWN);
      await draw(game.turno.playerId, gameId);
      const seen = [];

      for (let i = 0; i < 6; i++) {
        await avanza(COOLDOWN);
        seen.push(game.turno.playerId);
        await draw(game.turno.playerId, gameId);
      }

      expect(seen).not.toContain(away.id);
    });

    test('if nobody is connected the server cannot tell who is away, and skips nobody', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo']);
      online.clear();
      await avanza(COOLDOWN);

      await expect(draw(game.turno.playerId, gameId)).resolves.toBeDefined();
      expect(game.turno.playerId).toEqual(expect.any(String));
    });

    test('a game in progress when the server restarts goes on: the timer is armed again', async () => {
      const { game } = await newGame(['Anna', 'Carlo']);
      jest.clearAllTimers();

      riarmaTurni(gameState, io, () => store);
      await avanza(TURNO);

      expect(game.carteEstratte).toHaveLength(1);
    });
  });

  describe('the classic mode is left as it was', () => {
    test('the creator draws, nobody else does, with no turn and no limit', async () => {
      const { gameId, game } = await newGame(['Anna', 'Carlo'], {});

      await expect(draw(players[1].id, gameId)).rejects.toMatchObject({ statusCode: 403 });
      await draw(players[0].id, gameId);
      await draw(players[0].id, gameId);
      await avanza(TURNO * 3);

      expect(game.carteEstratte).toHaveLength(2);
      expect(eventsNamed('ammonizione')).toHaveLength(0);
    });
  });

  test('the game ends the turns: after the end nothing is drawn by itself', async () => {
    const { game } = await newGame(['Anna', 'Carlo']);
    game.status = 'finished';

    await avanza(TURNO * 2);

    expect(game.carteEstratte).toHaveLength(0);
  });
});
