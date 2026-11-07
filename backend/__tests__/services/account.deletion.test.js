/**
 * Account Deletion Tests
 *
 * The service that deletes an account for the admin and for the user: the rules, the game state and the
 * answer when the store cannot write.
 */

import { jest } from '@jest/globals';
import { deleteAccount } from '../../src/services/account.service.js';
import { deleteUser } from '../../src/services/admin.service.js';
import { authenticateToken } from '../../src/middleware/auth.middleware.js';
import { signAccessToken } from '../../src/services/auth.service.js';
import { createMemoryStore, DELETED_PLAYER_NAME } from '../../src/db/store.js';

const admin = { type: 'player', id: 'p9' };

describe('account deletion', () => {
  let store;
  let gameState;

  beforeEach(async () => {
    store = createMemoryStore();
    gameState = { players: {}, games: {} };
    for (const [id, name, credits] of [['p1', 'Anna', 300], ['p2', 'Carlo', 100], ['p9', 'Admin', 0]]) {
      await store.createAccount({ id }, { username: name, usernameKey: name.toLowerCase(), passwordHash: 'hash' });
      gameState.players[id] = { id, name, credits, currentGameId: null };
    }
    await store.setAccountRole('p9', 'admin', { actor: { type: 'system' } });
  });

  test('removes the player from the game state and tells who was deleted', async () => {
    await expect(deleteAccount(store, gameState, 'p1', { reason: 'abuso' }, admin)).resolves.toEqual({ playerId: 'p1', credits: 300 });

    expect(gameState.players.p1).toBeUndefined();
    await expect(store.findAccountById('p1')).resolves.toBeNull();
  });

  test('the name in the finished games that the game state still has becomes "Utente eliminato", the id stays', async () => {
    gameState.games.g1 = {
      id: 'g1', status: 'finished', montepremi: 200,
      players: [{ id: 'p1', name: 'Anna' }, { id: 'p2', name: 'Carlo' }],
      collezioni: { tris: { vincitore: { id: 'p1', name: 'Anna' }, vincitori: [{ id: 'p1', name: 'Anna' }] } },
    };

    await deleteAccount(store, gameState, 'p1', { reason: 'x' }, admin);

    const game = gameState.games.g1;
    expect(game.players).toEqual([{ id: 'p1', name: DELETED_PLAYER_NAME }, { id: 'p2', name: 'Carlo' }]);
    expect(game.collezioni.tris.vincitore).toEqual({ id: 'p1', name: DELETED_PLAYER_NAME });
    expect(JSON.stringify(game)).not.toContain('Anna');
  });

  test('a player who is in a game that is waiting or in progress is a 409, and nothing changes', async () => {
    for (const status of ['waiting', 'playing']) {
      gameState.games.g1 = { id: 'g1', status, players: [{ id: 'p1', name: 'Anna' }] };

      await expect(deleteAccount(store, gameState, 'p1', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 409 });

      expect(gameState.players.p1).toBeDefined();
      expect(gameState.players.p1.deleting).toBeUndefined();
      await expect(store.findAccountById('p1')).resolves.not.toBeNull();
    }
  });

  test('the last active admin is a 409', async () => {
    await expect(deleteAccount(store, gameState, 'p9', { reason: 'x' }, { type: 'system' })).rejects.toMatchObject({ statusCode: 409 });

    expect(gameState.players.p9).toBeDefined();
  });

  test('an unknown user is a 404', async () => {
    await expect(deleteAccount(store, gameState, 'ghost', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('if the store cannot write, the answer is a 503 and the player is as before, free to go on', async () => {
    store.deleteAccount = jest.fn().mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(deleteAccount(store, gameState, 'p1', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 503 });

    expect(gameState.players.p1).toMatchObject({ credits: 300 });
    expect(gameState.players.p1.deleting).toBeUndefined();
    jest.restoreAllMocks();
  });

  test('while the store writes, the player is not let in by the token: they cannot join a game meanwhile', async () => {
    let seen;
    const real = store.deleteAccount.bind(store);
    store.deleteAccount = async (...args) => {
      seen = await authenticateToken(signAccessToken('p1', 'player', 0), gameState, store);
      return real(...args);
    };

    await deleteAccount(store, gameState, 'p1', { reason: 'x' }, admin);

    expect(seen).toBeNull();
  });

  describe('the user deleting their own account', () => {
    const self = { type: 'player', id: 'p1' };

    test('gets their own messages: in a game, or the last active admin', async () => {
      gameState.games.g1 = { id: 'g1', status: 'playing', players: [{ id: 'p1', name: 'Anna' }] };
      await expect(deleteAccount(store, gameState, 'p1', {}, self)).rejects.toMatchObject({
        statusCode: 409,
        message: 'You cannot delete your account while you are in a game',
      });

      await expect(deleteAccount(store, gameState, 'p9', {}, { type: 'player', id: 'p9' })).rejects.toMatchObject({
        statusCode: 409,
        message: 'You are the last active admin: make another admin first',
      });
    });

    test('needs no reason, and the audit log says that they did it themselves', async () => {
      await deleteAccount(store, gameState, 'p1', {}, self);

      const [event] = await store.listAuditEvents({ targetId: 'p1' });
      expect(event).toMatchObject({ action: 'user_deleted', actorId: 'p1', details: { reason: null, self: true } });
    });
  });

  describe('deleteUser, for the admin', () => {
    test('an admin cannot delete themselves from the admin area', async () => {
      await expect(deleteUser(store, gameState, 'p9', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 409 });
    });

    test('deletes another user with a reason', async () => {
      await expect(deleteUser(store, gameState, 'p1', { reason: 'abuso' }, admin)).resolves.toMatchObject({ playerId: 'p1' });
    });
  });
});
