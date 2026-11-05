/**
 * Admin Games Tests
 *
 * The admin sees the games with their metadata only, cancels one that is stuck (the players who are
 * still in it get the entry fee back) and reads the statistics of the platform.
 */

import { jest } from '@jest/globals';
import { cancelGame, getStats, listAudit, listGames } from '../../src/services/admin.service.js';
import { createMemoryStore } from '../../src/db/store.js';

const admin = { type: 'player', id: 'p9' };

describe('admin games', () => {
  let store;
  let gameState;

  const addGame = (id, status, players, extra = {}) => {
    gameState.games[id] = {
      id,
      status,
      isPrivate: false,
      requiredCredits: 100,
      maxPlayers: 4,
      montepremi: status === 'waiting' ? 0 : players.length * 100,
      createdAt: `2026-01-0${Object.keys(gameState.games).length + 1}T10:00:00.000Z`,
      mazzo: [{ valore: '7', seme: 'coppe' }],
      carteEstratte: [],
      players: players.map((playerId) => ({
        id: playerId,
        name: gameState.players[playerId].name,
        cartella: [[{ valore: 'A', seme: 'spade' }]],
        coperte: [],
        gettoni: 0,
        gettoniSaldati: 0,
        collezioni: [],
      })),
      ...extra,
    };
    for (const playerId of players) {
      gameState.players[playerId].currentGameId = id;
    }
    return gameState.games[id];
  };

  beforeEach(async () => {
    store = createMemoryStore();
    gameState = { players: {}, games: {} };
    for (const [id, name, credits] of [['p1', 'Anna', 400], ['p2', 'Carlo', 300], ['p3', 'Dario', 200], ['p9', 'Admin', 0]]) {
      await store.createAccount({ id }, { username: name, usernameKey: name.toLowerCase(), passwordHash: 'hash' });
      gameState.players[id] = { id, name, credits, currentGameId: null };
    }
  });

  describe('listGames', () => {
    test('lists the games that are waiting or playing, the oldest first, with metadata only', () => {
      addGame('g1', 'playing', ['p1', 'p2']);
      addGame('g2', 'waiting', ['p3']);
      addGame('g3', 'finished', []);

      const page = listGames(gameState, {});

      expect(page).toMatchObject({ total: 2, page: 1, limit: 20 });
      expect(page.items.map((g) => g.id)).toEqual(['g1', 'g2']);
      expect(page.items[0]).toEqual({
        id: 'g1',
        status: 'playing',
        isPrivate: false,
        requiredCredits: 100,
        maxPlayers: 4,
        montepremi: 200,
        createdAt: '2026-01-01T10:00:00.000Z',
        players: [{ id: 'p1', name: 'Anna' }, { id: 'p2', name: 'Carlo' }],
      });
    });

    test('never carries the deck, the grids, the drawn cards or the balances', () => {
      addGame('g1', 'playing', ['p1', 'p2'], { carteEstratte: [{ valore: '3', seme: 'bastoni' }] });

      const text = JSON.stringify(listGames(gameState, {}));

      expect(text).not.toMatch(/mazzo|cartella|coperte|carteEstratte|gettoni|collezioni|credits/);
    });

    test('filters by status and paginates', () => {
      for (let i = 1; i <= 5; i += 1) {
        addGame(`w${i}`, 'waiting', []);
      }
      addGame('g1', 'playing', ['p1']);

      expect(listGames(gameState, { status: 'playing' }).items.map((g) => g.id)).toEqual(['g1']);
      const second = listGames(gameState, { status: 'waiting', page: 2, limit: 2 });
      expect(second).toMatchObject({ total: 5, page: 2, limit: 2 });
      expect(second.items.map((g) => g.id)).toEqual(['w3', 'w4']);
    });
  });

  describe('cancelGame', () => {
    test('a game in progress is removed and every player still in it gets the entry fee back', async () => {
      addGame('g1', 'playing', ['p1', 'p2']);
      gameState.players.p1.credits = 300; // after the fee
      gameState.players.p2.credits = 200;

      const result = await cancelGame(store, gameState, 'g1', { reason: 'bloccata' }, admin);

      expect(result).toEqual({
        gameId: 'g1',
        previousStatus: 'playing',
        players: [{ playerId: 'p1', credits: 400, refund: 100 }, { playerId: 'p2', credits: 300, refund: 100 }],
      });
      expect(gameState.games.g1).toBeUndefined();
      expect(gameState.players.p1).toMatchObject({ credits: 400, currentGameId: null });
      expect(gameState.players.p2).toMatchObject({ credits: 300, currentGameId: null });
    });

    test('the prizes already awarded but not yet credited are lost: the game counts as never played', async () => {
      const game = addGame('g1', 'playing', ['p1', 'p2']);
      game.players[0].gettoni = 250;
      game.players[0].gettoniSaldati = 0;
      gameState.players.p1.credits = 300;

      await cancelGame(store, gameState, 'g1', { reason: 'bloccata' }, admin);

      expect(gameState.players.p1.credits).toBe(400);
    });

    test('a game that is waiting is removed and nobody is refunded, because nobody paid', async () => {
      addGame('g2', 'waiting', ['p3']);

      const result = await cancelGame(store, gameState, 'g2', { reason: 'abbandonata' }, admin);

      expect(result.players).toEqual([{ playerId: 'p3', credits: 200, refund: 0 }]);
      expect(gameState.games.g2).toBeUndefined();
      expect(gameState.players.p3).toMatchObject({ credits: 200, currentGameId: null });
    });

    test('writes who, why and the refunds in the audit log', async () => {
      addGame('g1', 'playing', ['p1']);

      await cancelGame(store, gameState, 'g1', { reason: '  bloccata  ' }, admin);

      const [event] = await store.listAuditEvents({});
      expect(event).toMatchObject({
        actorType: 'player',
        actorId: 'p9',
        action: 'game_cancelled',
        targetId: 'g1',
        details: { reason: 'bloccata', previousStatus: 'playing', refunds: [{ playerId: 'p1', amount: 100 }] },
      });
    });

    test('an unknown game is a 404 and a finished one is a 409', async () => {
      addGame('g3', 'finished', []);

      await expect(cancelGame(store, gameState, 'ghost', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 404 });
      await expect(cancelGame(store, gameState, 'g3', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 409 });
      expect(gameState.games.g3).toBeDefined();
    });

    test('a game id that is a property of every object is not a game', async () => {
      await expect(cancelGame(store, gameState, 'constructor', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 404 });
    });

    test('if the store cannot write, nothing changes and the answer is a 503', async () => {
      const game = addGame('g1', 'playing', ['p1', 'p2']);
      gameState.players.p1.credits = 300;
      gameState.players.p2.credits = 200;
      store.cancelGame = jest.fn().mockRejectedValue(new Error('db down'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(cancelGame(store, gameState, 'g1', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 503 });

      expect(gameState.games.g1).toBe(game);
      expect(gameState.players.p1).toMatchObject({ credits: 300, currentGameId: 'g1' });
      expect(gameState.players.p2).toMatchObject({ credits: 200, currentGameId: 'g1' });
      jest.restoreAllMocks();
    });

    test('a player who left before the cancellation is not refunded: the fee is gone', async () => {
      addGame('g1', 'playing', ['p1']);
      gameState.players.p2.credits = 200; // left the game earlier, lost the fee

      const result = await cancelGame(store, gameState, 'g1', { reason: 'x' }, admin);

      expect(result.players.map((p) => p.playerId)).toEqual(['p1']);
      expect(gameState.players.p2.credits).toBe(200);
    });
  });

  describe('getStats', () => {
    test('counts users, games, credits and prizes without naming anyone', async () => {
      addGame('g1', 'playing', ['p1', 'p2']);
      addGame('g2', 'waiting', ['p3']);
      addGame('g3', 'finished', [], { montepremi: 500 });
      addGame('g4', 'finished', [], { montepremi: 300 });
      gameState.games.g3.players = [];
      await store.setAccountRole('p9', 'admin', { actor: { type: 'system' } });

      const stats = await getStats(store, gameState);

      expect(stats).toEqual({
        users: { registered: 4, inGame: 3, admins: 1 },
        games: { waiting: 1, playing: 1, finished: 2, cancelled: 0 },
        credits: { inCirculation: 900, inPlay: 200 },
        prizesDistributed: 800,
      });
      expect(JSON.stringify(stats)).not.toMatch(/Anna|Carlo|p1|p2/);
    });

    test('counts the cancelled games from the audit log', async () => {
      addGame('g1', 'playing', ['p1']);
      await cancelGame(store, gameState, 'g1', { reason: 'x' }, admin);

      const stats = await getStats(store, gameState);

      expect(stats.games).toMatchObject({ playing: 0, cancelled: 1 });
    });

    test('with a database the finished games come from it: they are not all in memory', async () => {
      addGame('g1', 'playing', ['p1']);
      store.gameStats = async () => ({ finished: 40, prizesDistributed: 12000 });

      const stats = await getStats(store, gameState);

      expect(stats.games).toMatchObject({ playing: 1, finished: 40 });
      expect(stats.prizesDistributed).toBe(12000);
    });
  });

  test('the audit log shows the cancelled game with the name of who cancelled it', async () => {
    addGame('g1', 'waiting', ['p3']);
    await cancelGame(store, gameState, 'g1', { reason: 'x' }, admin);

    const { items } = await listAudit(store, {}, gameState);

    expect(items[0]).toMatchObject({ action: 'game_cancelled', actorName: 'Admin', targetName: null });
  });
});
