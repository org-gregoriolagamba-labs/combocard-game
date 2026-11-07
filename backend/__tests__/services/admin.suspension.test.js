/**
 * Admin Suspension Tests
 *
 * The admin suspends and reinstates a user and closes their sessions. Not themselves, not the last admin.
 */

import { jest } from '@jest/globals';
import { revokeUserSessions, suspendUser, unsuspendUser, getUser } from '../../src/services/admin.service.js';
import { createMemoryStore } from '../../src/db/store.js';

const admin = { type: 'player', id: 'p9' };

describe('admin suspension', () => {
  let store;
  let gameState;

  beforeEach(async () => {
    store = createMemoryStore();
    gameState = { players: {}, games: {} };
    for (const [id, name] of [['p1', 'Anna'], ['p9', 'Admin']]) {
      await store.createAccount({ id }, { username: name, usernameKey: name.toLowerCase(), passwordHash: 'hash' });
      gameState.players[id] = { id, name, credits: 0, currentGameId: null };
    }
    await store.setAccountRole('p9', 'admin', { actor: { type: 'system' } });
  });

  test('a user starts as not suspended', async () => {
    await expect(getUser(store, gameState, 'p1')).resolves.toMatchObject({ suspended: false });
  });

  test('suspends a user and answers with the user as it is now', async () => {
    await expect(suspendUser(store, gameState, 'p1', { reason: 'abuso' }, admin))
      .resolves.toMatchObject({ playerId: 'p1', suspended: true });
  });

  test('reinstates a user', async () => {
    await suspendUser(store, gameState, 'p1', { reason: 'abuso' }, admin);

    await expect(unsuspendUser(store, gameState, 'p1', { reason: 'chiarito' }, admin))
      .resolves.toMatchObject({ playerId: 'p1', suspended: false });
  });

  test('closes the sessions of a user without suspending them', async () => {
    const before = (await store.findAccountById('p1')).sessionVersion;

    await expect(revokeUserSessions(store, gameState, 'p1', { reason: 'furto' }, admin))
      .resolves.toMatchObject({ playerId: 'p1', suspended: false });

    expect((await store.findAccountById('p1')).sessionVersion).toBeGreaterThan(before);
  });

  test('an unknown user is a 404', async () => {
    await expect(suspendUser(store, gameState, 'ghost', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 404 });
    await expect(unsuspendUser(store, gameState, 'ghost', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 404 });
    await expect(revokeUserSessions(store, gameState, 'ghost', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('an admin cannot suspend themselves, nor the last admin', async () => {
    await store.setAccountRole('p1', 'admin', { actor: { type: 'system' } });

    await expect(suspendUser(store, gameState, 'p9', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 409 });
    await suspendUser(store, gameState, 'p1', { reason: 'x' }, admin); // p9 stays the only active admin
    await expect(suspendUser(store, gameState, 'p9', { reason: 'x' }, { type: 'player', id: 'p1' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('if the store cannot write, the answer is a 503', async () => {
    store.setAccountSuspended = jest.fn().mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(suspendUser(store, gameState, 'p1', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 503 });
    jest.restoreAllMocks();
  });
});
