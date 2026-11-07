/**
 * Deletion of an account in the memory store
 *
 * The account and its tokens go, the name is free again, the audit log keeps the id but loses the names.
 * The last active admin cannot be deleted. The row of the audit log of the deletion has no username.
 */

import { createMemoryStore, DELETED_PLAYER_NAME, LAST_ADMIN } from '../../src/db/store.js';

const system = { type: 'system' };
const admin = { type: 'player', id: 'p9' };
const next = { tokenHash: 'n', expiresAt: new Date(Date.now() + 60000), graceSeconds: 10 };

describe('deleteAccount of the memory store', () => {
  let store;

  beforeEach(async () => {
    store = createMemoryStore();
    for (const [id, name] of [['p1', 'Anna'], ['p2', 'Carlo'], ['p9', 'Admin']]) {
      await store.createAccount({ id }, { username: name, usernameKey: name.toLowerCase(), passwordHash: `hash-${id}` });
    }
    await store.setAccountRole('p9', 'admin', { actor: system });
  });

  test('the placeholder of the name is "Utente eliminato"', () => {
    expect(DELETED_PLAYER_NAME).toBe('Utente eliminato');
  });

  test('removes the account: nobody finds it, the name is free, the tokens are gone', async () => {
    await store.createRefreshToken({ tokenHash: 'h1', familyId: 'f1', playerId: 'p1', expiresAt: new Date(Date.now() + 60000) });

    await expect(store.deleteAccount('p1', { actor: admin, reason: 'abuso' })).resolves.toEqual({ playerId: 'p1' });

    await expect(store.findAccountById('p1')).resolves.toBeNull();
    await expect(store.getAccount('p1')).resolves.toBeNull();
    await expect(store.findAccountByUsernameKey('anna')).resolves.toBeNull();
    await expect(store.rotateRefreshToken('h1', next)).resolves.toBeNull();
    await expect(store.listAccounts({})).resolves.toMatchObject({ total: 2 });
    await expect(store.createAccount({ id: 'p5' }, { username: 'Anna', usernameKey: 'anna', passwordHash: 'x' })).resolves.toBeUndefined();
  });

  test('writes user_deleted with id, role and reason, and never the username', async () => {
    await store.deleteAccount('p1', { actor: admin, reason: ' abuso ' });

    const [event] = await store.listAuditEvents({ targetId: 'p1' });
    expect(event).toMatchObject({ action: 'user_deleted', actorId: 'p9', targetId: 'p1', details: { role: 'player', reason: 'abuso', self: false } });
    expect(JSON.stringify(event)).not.toMatch(/Anna|anna/);
  });

  test('a deletion by the user themselves is marked, and needs no reason', async () => {
    await store.deleteAccount('p1', { actor: { type: 'player', id: 'p1' } });

    const [event] = await store.listAuditEvents({ targetId: 'p1' });
    expect(event).toMatchObject({ action: 'user_deleted', actorId: 'p1', details: { role: 'player', reason: null, self: true } });
  });

  test('the names in the earlier events of that user are rewritten, the others are left alone', async () => {
    await store.setAccountUsername('p1', { username: 'Anna Rossi', usernameKey: 'anna rossi' }, { actor: admin });
    await store.setAccountUsername('p2', { username: 'Carlo B', usernameKey: 'carlo b' }, { actor: admin });

    await store.deleteAccount('p1', { actor: admin, reason: 'x' });

    const [renamed] = await store.listAuditEvents({ targetId: 'p1', limit: 5, offset: 1 });
    expect(renamed.details).toEqual({ from: DELETED_PLAYER_NAME, to: DELETED_PLAYER_NAME });
    const [other] = await store.listAuditEvents({ targetId: 'p2' });
    expect(other.details).toEqual({ from: 'Carlo', to: 'Carlo B' });
  });

  test('an unknown account gives null; an actor is needed', async () => {
    await expect(store.deleteAccount('ghost', { actor: admin, reason: 'x' })).resolves.toBeNull();
    await expect(store.deleteAccount('p1', { reason: 'x' })).rejects.toThrow(TypeError);
    await expect(store.findAccountById('p1')).resolves.not.toBeNull();
  });

  test('the last active admin cannot be deleted, and the refusal leaves no trace', async () => {
    const events = await store.countAuditEvents({});

    await expect(store.deleteAccount('p9', { actor: system, reason: 'x' })).rejects.toMatchObject({ code: LAST_ADMIN });

    await expect(store.findAccountById('p9')).resolves.not.toBeNull();
    await expect(store.countAuditEvents({})).resolves.toBe(events);
  });

  test('an admin can be deleted when another one is active, or when they are the suspended one', async () => {
    await store.setAccountRole('p2', 'admin', { actor: system });
    await expect(store.deleteAccount('p9', { actor: system, reason: 'x' })).resolves.toEqual({ playerId: 'p9' });

    await store.setAccountRole('p1', 'admin', { actor: system });
    await store.setAccountSuspended('p1', true, { actor: system, reason: 'x' });
    await expect(store.deleteAccount('p1', { actor: system, reason: 'x' })).resolves.toEqual({ playerId: 'p1' });
    await expect(store.deleteAccount('p2', { actor: system, reason: 'x' })).rejects.toMatchObject({ code: LAST_ADMIN });
  });
});
