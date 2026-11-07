/**
 * Password reset and change of the memory store
 *
 * An admin resets a password: the old one stops working, the account must change the new one at the
 * next login, and every session closes. The user changing it themselves clears the obligation.
 * The password and the hash are never in the audit log.
 */

import { createMemoryStore } from '../../src/db/store.js';

const admin = { type: 'player', id: 'p9' };
const next = { tokenHash: 'n', expiresAt: new Date(Date.now() + 60000), graceSeconds: 10 };

describe('password of the memory store', () => {
  let store;

  beforeEach(async () => {
    store = createMemoryStore();
    for (const [id, name] of [['p1', 'Anna'], ['p2', 'Carlo']]) {
      await store.createAccount({ id }, { username: name, usernameKey: name.toLowerCase(), passwordHash: `hash-${id}` });
    }
  });

  test('a new account does not have to change the password, and its hash can be read for the check', async () => {
    await expect(store.findAccountById('p1')).resolves.toMatchObject({ mustChangePassword: false });
    await expect(store.getPasswordHash('p1')).resolves.toBe('hash-p1');
    await expect(store.getPasswordHash('ghost')).resolves.toBeNull();
  });

  test('the hash is not in what the authentication reads at every request', async () => {
    expect(await store.findAccountById('p1')).not.toHaveProperty('passwordHash');
  });

  describe('resetAccountPassword', () => {
    test('replaces the hash, asks for a change, moves the sessions on and revokes the refresh tokens', async () => {
      await store.createRefreshToken({ tokenHash: 'h1', familyId: 'f1', playerId: 'p1', expiresAt: new Date(Date.now() + 60000) });
      const before = (await store.findAccountById('p1')).sessionVersion;

      await expect(store.resetAccountPassword('p1', 'new-hash', { actor: admin, reason: 'dimenticata' })).resolves.toEqual({ playerId: 'p1' });

      await expect(store.getPasswordHash('p1')).resolves.toBe('new-hash');
      const account = await store.findAccountById('p1');
      expect(account.mustChangePassword).toBe(true);
      expect(account.sessionVersion).toBeGreaterThan(before);
      await expect(store.rotateRefreshToken('h1', next)).resolves.toBeNull();
      await expect(store.getPasswordHash('p2')).resolves.toBe('hash-p2');
    });

    test('is in the audit log with who and why, and never with the password or the hash', async () => {
      await store.resetAccountPassword('p1', 'secret-new-hash', { actor: admin, reason: ' dimenticata ' });

      const [event] = await store.listAuditEvents({ targetId: 'p1' });
      expect(event).toMatchObject({ action: 'password_reset', actorId: 'p9', details: { reason: 'dimenticata' } });
      expect(JSON.stringify(event)).not.toMatch(/secret-new-hash/);
    });

    test('an unknown account gives null; a reason and an actor are needed', async () => {
      await expect(store.resetAccountPassword('ghost', 'h', { actor: admin, reason: 'x' })).resolves.toBeNull();
      await expect(store.resetAccountPassword('p1', 'h', { actor: admin })).rejects.toThrow(TypeError);
      await expect(store.resetAccountPassword('p1', 'h', { reason: 'x' })).rejects.toThrow(TypeError);
      await expect(store.getPasswordHash('p1')).resolves.toBe('hash-p1');
    });
  });

  describe('changeAccountPassword', () => {
    test('replaces the hash, clears the obligation, closes the other sessions and gives the new version', async () => {
      await store.resetAccountPassword('p1', 'temp-hash', { actor: admin, reason: 'x' });
      await store.createRefreshToken({ tokenHash: 'h2', familyId: 'f2', playerId: 'p1', expiresAt: new Date(Date.now() + 60000) });
      const before = (await store.findAccountById('p1')).sessionVersion;

      const result = await store.changeAccountPassword('p1', 'mine-hash', { actor: { type: 'player', id: 'p1' } });

      expect(result).toEqual({ playerId: 'p1', sessionVersion: before + 1 });
      await expect(store.getPasswordHash('p1')).resolves.toBe('mine-hash');
      await expect(store.findAccountById('p1')).resolves.toMatchObject({ mustChangePassword: false, sessionVersion: before + 1 });
      await expect(store.rotateRefreshToken('h2', next)).resolves.toBeNull();
    });

    test('is in the audit log, without the password', async () => {
      await store.changeAccountPassword('p1', 'mine-hash', { actor: { type: 'player', id: 'p1' } });

      const [event] = await store.listAuditEvents({ targetId: 'p1' });
      expect(event).toMatchObject({ action: 'password_changed', actorId: 'p1' });
      expect(JSON.stringify(event)).not.toMatch(/mine-hash/);
    });

    test('an unknown account gives null, and an actor is needed', async () => {
      await expect(store.changeAccountPassword('ghost', 'h', { actor: admin })).resolves.toBeNull();
      await expect(store.changeAccountPassword('p1', 'h')).rejects.toThrow(TypeError);
    });
  });
});
