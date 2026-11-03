/**
 * Admin Service Tests
 *
 * Changing the role of an account from its username: what the command line script does.
 */

import { changeRoleByUsername } from '../../src/services/admin.service.js';
import { createMemoryStore } from '../../src/db/store.js';

const system = { type: 'system' };

describe('changeRoleByUsername', () => {
  let store;

  beforeEach(async () => {
    store = createMemoryStore();
    await store.createAccount({ id: 'p1' }, { usernameKey: 'anna', passwordHash: 'hash' });
    await store.createAccount({ id: 'p2' }, { usernameKey: 'carlo', passwordHash: 'hash' });
  });

  test('promotes the account of a username', async () => {
    await expect(changeRoleByUsername(store, { username: 'carlo', role: 'admin', actor: system }))
      .resolves.toEqual({ playerId: 'p2', role: 'admin', previousRole: 'player', changed: true });
  });

  test('finds the user however the name is written, as at the login', async () => {
    await expect(changeRoleByUsername(store, { username: '  ANNA ', role: 'admin', actor: system }))
      .resolves.toMatchObject({ playerId: 'p1', changed: true });
  });

  test('doing it twice is harmless and says nothing changed', async () => {
    await changeRoleByUsername(store, { username: 'anna', role: 'admin', actor: system });

    await expect(changeRoleByUsername(store, { username: 'anna', role: 'admin', actor: system }))
      .resolves.toMatchObject({ changed: false });
  });

  test('an unknown username is a 404', async () => {
    await expect(changeRoleByUsername(store, { username: 'nobody', role: 'admin', actor: system }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('the last admin cannot be demoted: 409, and it stays admin', async () => {
    await changeRoleByUsername(store, { username: 'anna', role: 'admin', actor: system });

    await expect(changeRoleByUsername(store, { username: 'anna', role: 'player', actor: system }))
      .rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/last admin/i) });
    await expect(store.findAccountById('p1')).resolves.toMatchObject({ role: 'admin' });
  });

  test('a role that does not exist is a 400', async () => {
    await expect(changeRoleByUsername(store, { username: 'anna', role: 'root', actor: system }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('writes who did it in the audit log', async () => {
    await changeRoleByUsername(store, { username: 'anna', role: 'admin', actor: system });

    await expect(store.listAuditEvents()).resolves.toEqual([
      expect.objectContaining({ action: 'role_changed', actorType: 'system', targetId: 'p1', details: { from: 'player', to: 'admin' } }),
    ]);
  });
});
