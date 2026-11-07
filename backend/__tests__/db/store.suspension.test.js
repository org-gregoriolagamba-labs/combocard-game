/**
 * Suspension and sessions of the memory store
 *
 * A suspended account cannot use the platform; closing the sessions of an account makes every token
 * it holds useless. Both leave a trace in the audit log.
 */

import { createMemoryStore, LAST_ADMIN } from '../../src/db/store.js';

const system = { type: 'system' };
const admin = { type: 'player', id: 'p9' };

describe('suspension and sessions of the memory store', () => {
  let store;

  const token = (playerId, tokenHash, familyId = `f-${tokenHash}`) =>
    store.createRefreshToken({ tokenHash, familyId, playerId, expiresAt: new Date(Date.now() + 60000) });

  beforeEach(async () => {
    store = createMemoryStore();
    for (const [id, name] of [['p1', 'Anna'], ['p2', 'Carlo'], ['p9', 'Admin']]) {
      await store.createAccount({ id }, { username: name, usernameKey: name.toLowerCase(), passwordHash: 'hash' });
    }
    await store.setAccountRole('p9', 'admin', { actor: system });
  });

  test('a new account is active and has the first version of the session', async () => {
    await expect(store.findAccountById('p1')).resolves.toMatchObject({ suspended: false, sessionVersion: 0 });
    await expect(store.getAccount('p1')).resolves.toMatchObject({ suspended: false });
  });

  describe('setAccountSuspended', () => {
    test('suspends an account and says what changed', async () => {
      await expect(store.setAccountSuspended('p1', true, { actor: admin, reason: 'abuso' }))
        .resolves.toEqual({ playerId: 'p1', suspended: true, previousSuspended: false, changed: true });

      await expect(store.findAccountById('p1')).resolves.toMatchObject({ suspended: true });
      await expect(store.getAccount('p1')).resolves.toMatchObject({ suspended: true });
      await expect(store.findAccountByUsernameKey('anna')).resolves.toMatchObject({ suspended: true });
    });

    test('suspending closes the sessions: the version moves on and the refresh tokens stop working', async () => {
      await token('p1', 'h1');
      const before = (await store.findAccountById('p1')).sessionVersion;

      await store.setAccountSuspended('p1', true, { actor: admin, reason: 'abuso' });

      expect((await store.findAccountById('p1')).sessionVersion).toBeGreaterThan(before);
      await expect(store.rotateRefreshToken('h1', { tokenHash: 'h2', expiresAt: new Date(Date.now() + 60000), graceSeconds: 10 }))
        .resolves.toBeNull();
    });

    test('lifts the suspension without touching the sessions of others', async () => {
      await store.setAccountSuspended('p1', true, { actor: admin, reason: 'abuso' });
      await token('p2', 'h-other');

      await expect(store.setAccountSuspended('p1', false, { actor: admin, reason: 'chiarito' }))
        .resolves.toMatchObject({ suspended: false, previousSuspended: true, changed: true });

      await expect(store.findAccountById('p1')).resolves.toMatchObject({ suspended: false });
      await expect(store.rotateRefreshToken('h-other', { tokenHash: 'h3', expiresAt: new Date(Date.now() + 60000), graceSeconds: 10 }))
        .resolves.toBe('p2');
    });

    test('doing it twice changes nothing and writes nothing', async () => {
      await store.setAccountSuspended('p1', true, { actor: admin, reason: 'abuso' });
      const events = await store.countAuditEvents({});

      await expect(store.setAccountSuspended('p1', true, { actor: admin, reason: 'ancora' }))
        .resolves.toMatchObject({ changed: false });

      await expect(store.countAuditEvents({})).resolves.toBe(events);
    });

    test('writes who, why and what in the audit log', async () => {
      await store.setAccountSuspended('p1', true, { actor: admin, reason: '  abuso  ' });
      await store.setAccountSuspended('p1', false, { actor: admin, reason: 'chiarito' });

      const [lifted, suspended] = await store.listAuditEvents({ targetId: 'p1' });
      expect(suspended).toMatchObject({ actorType: 'player', actorId: 'p9', action: 'user_suspended', details: { reason: 'abuso' } });
      expect(lifted).toMatchObject({ action: 'user_unsuspended', details: { reason: 'chiarito' } });
    });

    test('an account that does not exist gives null', async () => {
      await expect(store.setAccountSuspended('ghost', true, { actor: admin, reason: 'x' })).resolves.toBeNull();
    });

    test('needs a reason and an actor: nothing changes without a trace', async () => {
      await expect(store.setAccountSuspended('p1', true, { actor: admin })).rejects.toThrow(TypeError);
      await expect(store.setAccountSuspended('p1', true, { actor: admin, reason: '  ' })).rejects.toThrow(TypeError);
      await expect(store.setAccountSuspended('p1', true, { reason: 'x' })).rejects.toThrow(TypeError);
      await expect(store.findAccountById('p1')).resolves.toMatchObject({ suspended: false });
    });

    test('the last active admin cannot be suspended', async () => {
      await expect(store.setAccountSuspended('p9', true, { actor: system, reason: 'x' })).rejects.toMatchObject({ code: LAST_ADMIN });
      await expect(store.findAccountById('p9')).resolves.toMatchObject({ suspended: false });
    });

    test('an admin can be suspended when another one stays active', async () => {
      await store.setAccountRole('p2', 'admin', { actor: system });

      await expect(store.setAccountSuspended('p9', true, { actor: system, reason: 'x' })).resolves.toMatchObject({ changed: true });
    });

    test('a suspended admin does not count: the one who is left cannot be demoted or suspended', async () => {
      await store.setAccountRole('p2', 'admin', { actor: system });
      await store.setAccountSuspended('p2', true, { actor: system, reason: 'x' });

      await expect(store.setAccountRole('p9', 'player', { actor: system })).rejects.toMatchObject({ code: LAST_ADMIN });
      await expect(store.setAccountSuspended('p9', true, { actor: system, reason: 'x' })).rejects.toMatchObject({ code: LAST_ADMIN });
    });

    test('a suspended admin can be demoted: they were not one of the active ones', async () => {
      await store.setAccountRole('p2', 'admin', { actor: system });
      await store.setAccountSuspended('p2', true, { actor: system, reason: 'x' });

      await expect(store.setAccountRole('p2', 'player', { actor: system })).resolves.toMatchObject({ changed: true });
    });
  });

  describe('revokeAccountSessions', () => {
    test('moves the version on and revokes every refresh token of the account, only theirs', async () => {
      await token('p1', 'a1');
      await token('p1', 'a2');
      await token('p2', 'b1');
      const before = (await store.findAccountById('p1')).sessionVersion;

      await expect(store.revokeAccountSessions('p1', { actor: admin, reason: 'furto' })).resolves.toEqual({ playerId: 'p1' });

      expect((await store.findAccountById('p1')).sessionVersion).toBeGreaterThan(before);
      const next = { expiresAt: new Date(Date.now() + 60000), graceSeconds: 10 };
      await expect(store.rotateRefreshToken('a1', { ...next, tokenHash: 'n1' })).resolves.toBeNull();
      await expect(store.rotateRefreshToken('a2', { ...next, tokenHash: 'n2' })).resolves.toBeNull();
      await expect(store.rotateRefreshToken('b1', { ...next, tokenHash: 'n3' })).resolves.toBe('p2');
      await expect(store.findAccountById('p1')).resolves.toMatchObject({ suspended: false });
    });

    test('writes it in the audit log and needs a reason', async () => {
      await store.revokeAccountSessions('p1', { actor: admin, reason: 'furto' });

      const [event] = await store.listAuditEvents({ targetId: 'p1' });
      expect(event).toMatchObject({ action: 'sessions_revoked', actorId: 'p9', details: { reason: 'furto' } });
      await expect(store.revokeAccountSessions('p1', { actor: admin })).rejects.toThrow(TypeError);
    });

    test('an account that does not exist gives null', async () => {
      await expect(store.revokeAccountSessions('ghost', { actor: admin, reason: 'x' })).resolves.toBeNull();
    });
  });
});
