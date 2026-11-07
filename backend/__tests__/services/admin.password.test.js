/**
 * Admin Password Reset Tests
 *
 * The admin resets the password of a user: the server makes a temporary one, which the admin sees once.
 */

import { jest } from '@jest/globals';
import { resetUserPassword } from '../../src/services/admin.service.js';
import { generateTemporaryPassword, verifyPassword } from '../../src/services/auth.service.js';
import { createMemoryStore } from '../../src/db/store.js';

const admin = { type: 'player', id: 'p9' };

describe('generateTemporaryPassword', () => {
  test('is long enough for the policy, readable and different every time', () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();

    expect(a).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){2}$/);
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(a).not.toBe(b);
  });
});

describe('resetUserPassword', () => {
  let store;
  let gameState;

  beforeEach(async () => {
    store = createMemoryStore();
    gameState = { players: {}, games: {} };
    for (const [id, name] of [['p1', 'Anna'], ['p9', 'Admin']]) {
      await store.createAccount({ id }, { username: name, usernameKey: name.toLowerCase(), passwordHash: 'old' });
      gameState.players[id] = { id, name, credits: 0, currentGameId: null };
    }
  });

  test('gives the temporary password once, and it is the one that works now', async () => {
    const { user, temporaryPassword } = await resetUserPassword(store, gameState, 'p1', { reason: 'dimenticata' }, admin);

    expect(user).toMatchObject({ playerId: 'p1', username: 'Anna' });
    expect(temporaryPassword).toEqual(expect.any(String));
    await expect(verifyPassword(await store.getPasswordHash('p1'), temporaryPassword)).resolves.toBe(true);
    await expect(store.findAccountById('p1')).resolves.toMatchObject({ mustChangePassword: true });
  });

  test('the password is not in the user nor in the audit log', async () => {
    const { user, temporaryPassword } = await resetUserPassword(store, gameState, 'p1', { reason: 'x' }, admin);

    expect(JSON.stringify(user)).not.toContain(temporaryPassword);
    expect(JSON.stringify(await store.listAuditEvents({}))).not.toContain(temporaryPassword);
  });

  test('an unknown user is a 404, and an admin cannot reset their own password', async () => {
    await expect(resetUserPassword(store, gameState, 'ghost', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 404 });
    await expect(resetUserPassword(store, gameState, 'p9', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('if the store cannot write, the answer is a 503 and the password stays', async () => {
    store.resetAccountPassword = jest.fn().mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(resetUserPassword(store, gameState, 'p1', { reason: 'x' }, admin)).rejects.toMatchObject({ statusCode: 503 });

    await expect(store.getPasswordHash('p1')).resolves.toBe('old');
    jest.restoreAllMocks();
  });
});
