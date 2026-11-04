/**
 * Admin Service Tests
 *
 * Changing the role of an account from its username: what the command line script does.
 */

import { jest } from '@jest/globals';
import {
  adjustUserCredits,
  changeRoleByUsername,
  getUser,
  listAudit,
  listUsers,
  updateUser,
} from '../../src/services/admin.service.js';
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

describe('the admin area: users, credits, audit', () => {
  const admin = { type: 'player', id: 'p3' };
  let store;
  let gameState;

  const addUser = async (id, username, credits, extra = {}) => {
    await store.createAccount({ id }, { username, usernameKey: username.toLowerCase(), passwordHash: 'hash' });
    gameState.players[id] = { id, name: username, credits, currentGameId: null, ...extra };
  };

  beforeEach(async () => {
    store = createMemoryStore();
    gameState = { players: {}, games: {} };
    await addUser('p1', 'Anna', 100);
    await addUser('p2', 'Carlo Rossi', 50);
    await addUser('p3', 'Dario', 0);
    await addUser('p4', 'Anna Maria', 70);
    await store.setAccountRole('p3', 'admin', { actor: { type: 'system' } });
  });

  describe('listUsers', () => {
    test('lists the users with their credits from the game, a page at a time', async () => {
      const page = await listUsers(store, gameState, {});

      expect(page).toMatchObject({ total: 4, page: 1, limit: 20 });
      expect(page.items[0]).toEqual({
        playerId: 'p1', username: 'Anna', role: 'player', credits: 100, createdAt: expect.any(Date), inGame: false,
      });
      expect(page.items.map((u) => u.username)).toEqual(['Anna', 'Anna Maria', 'Carlo Rossi', 'Dario']);
    });

    test('searches without caring about capital letters or spaces at the ends, and filters by role', async () => {
      await expect(listUsers(store, gameState, { q: '  ANNA ' })).resolves.toMatchObject({ total: 2 });
      await expect(listUsers(store, gameState, { role: 'admin' })).resolves.toMatchObject({ total: 1, items: [{ playerId: 'p3' }] });
    });

    test('page 2 starts after the first limit users', async () => {
      const page = await listUsers(store, gameState, { page: 2, limit: 3 });

      expect(page.items.map((u) => u.username)).toEqual(['Dario']);
      expect(page).toMatchObject({ total: 4, page: 2, limit: 3 });
    });

    test('says who is in a game that has not finished, and shows 0 credits for a player the game does not know', async () => {
      gameState.games.g1 = { id: 'g1', status: 'playing', players: [{ id: 'p2' }] };
      gameState.games.g0 = { id: 'g0', status: 'finished', players: [{ id: 'p1' }] };
      delete gameState.players.p4;

      const { items } = await listUsers(store, gameState, {});

      expect(Object.fromEntries(items.map((u) => [u.playerId, u.inGame]))).toEqual({ p1: false, p2: true, p3: false, p4: false });
      expect(items.find((u) => u.playerId === 'p4').credits).toBe(0);
    });
  });

  describe('getUser', () => {
    test('gives one user, or a 404', async () => {
      await expect(getUser(store, gameState, 'p2')).resolves.toMatchObject({ playerId: 'p2', username: 'Carlo Rossi', credits: 50 });
      await expect(getUser(store, gameState, 'ghost')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateUser', () => {
    test('renames: the account, the name in the game state, and the audit log', async () => {
      const user = await updateUser(store, gameState, 'p2', { username: 'Carlo Bianchi' }, admin);

      expect(user).toMatchObject({ playerId: 'p2', username: 'Carlo Bianchi' });
      expect(gameState.players.p2.name).toBe('Carlo Bianchi');
      await expect(store.findAccountByUsernameKey('carlo bianchi')).resolves.toMatchObject({ playerId: 'p2' });
      await expect(store.listAuditEvents({ targetId: 'p2' })).resolves.toEqual([
        expect.objectContaining({ action: 'username_changed', actorId: 'p3', details: { from: 'Carlo Rossi', to: 'Carlo Bianchi' } }),
      ]);
    });

    test('a name in use is a 409, and nothing changes', async () => {
      await expect(updateUser(store, gameState, 'p2', { username: ' ANNA ' }, admin))
        .rejects.toMatchObject({ statusCode: 409, message: 'Username already taken' });

      expect(gameState.players.p2.name).toBe('Carlo Rossi');
    });

    test('a player in a game that has not finished cannot be renamed: 409', async () => {
      gameState.games.g1 = { id: 'g1', status: 'waiting', players: [{ id: 'p2' }] };

      await expect(updateUser(store, gameState, 'p2', { username: 'Carlo Bianchi' }, admin))
        .rejects.toMatchObject({ statusCode: 409, message: 'Cannot rename a player who is in a game' });

      expect(gameState.players.p2.name).toBe('Carlo Rossi');
    });

    test('a player whose game finished can be renamed', async () => {
      gameState.games.g1 = { id: 'g1', status: 'finished', players: [{ id: 'p2' }] };

      await expect(updateUser(store, gameState, 'p2', { username: 'Carlo Bianchi' }, admin)).resolves.toBeDefined();
    });

    test('promotes and demotes, and the last admin stays admin: 409', async () => {
      await expect(updateUser(store, gameState, 'p1', { role: 'admin' }, admin)).resolves.toMatchObject({ role: 'admin' });
      await expect(updateUser(store, gameState, 'p1', { role: 'player' }, admin)).resolves.toMatchObject({ role: 'player' });
      await expect(updateUser(store, gameState, 'p3', { role: 'player' }, admin))
        .rejects.toMatchObject({ statusCode: 409, message: 'Cannot remove the last admin' });
    });

    test('an admin can change the role of another admin, and demote themselves if another admin is left', async () => {
      await updateUser(store, gameState, 'p1', { role: 'admin' }, admin);

      await expect(updateUser(store, gameState, 'p3', { role: 'player' }, admin)).resolves.toMatchObject({ role: 'player' });
    });

    test('an unknown user is a 404', async () => {
      await expect(updateUser(store, gameState, 'ghost', { role: 'admin' }, admin)).rejects.toMatchObject({ statusCode: 404 });
      await expect(updateUser(store, gameState, 'ghost', { username: 'Nobody' }, admin)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('adjustUserCredits', () => {
    test('adds credits to the game state and writes the trace in the store', async () => {
      const spy = jest.spyOn(store, 'adjustCredits');

      const result = await adjustUserCredits(store, gameState, 'p1', { amount: 50, reason: 'regalo' }, admin);

      expect(result).toEqual({ playerId: 'p1', credits: 150 });
      expect(gameState.players.p1.credits).toBe(150);
      expect(spy).toHaveBeenCalledWith('p1', 50, { actor: admin, reason: 'regalo' });
      await expect(store.listAuditEvents({ targetId: 'p1' })).resolves.toEqual([
        expect.objectContaining({ action: 'credits_adjusted', actorId: 'p3', details: { amount: 50, reason: 'regalo' } }),
      ]);
    });

    test('takes credits away, down to zero', async () => {
      await expect(adjustUserCredits(store, gameState, 'p2', { amount: -50, reason: 'azzeramento' }, admin))
        .resolves.toEqual({ playerId: 'p2', credits: 0 });
    });

    test('more than the balance is a 409, and nothing changes', async () => {
      await expect(adjustUserCredits(store, gameState, 'p2', { amount: -51, reason: 'troppo' }, admin))
        .rejects.toMatchObject({ statusCode: 409, message: 'Insufficient credits' });

      expect(gameState.players.p2.credits).toBe(50);
      await expect(store.listAuditEvents({ targetId: 'p2' })).resolves.toEqual([]);
    });

    test('an admin can correct their own credits, and the log shows that the actor is the target', async () => {
      await expect(adjustUserCredits(store, gameState, 'p3', { amount: 500, reason: 'prove' }, admin))
        .resolves.toEqual({ playerId: 'p3', credits: 500 });

      const [event] = await store.listAuditEvents({ targetId: 'p3' });
      expect(event.actorId).toBe('p3');
      expect(event.targetId).toBe('p3');
    });

    test('if the store cannot write, the credits go back and it answers 503', async () => {
      jest.spyOn(store, 'adjustCredits').mockRejectedValue(new Error('database down'));

      await expect(adjustUserCredits(store, gameState, 'p1', { amount: 50, reason: 'regalo' }, admin))
        .rejects.toMatchObject({ statusCode: 503 });

      expect(gameState.players.p1.credits).toBe(100);
    });

    test('an unknown player is a 404', async () => {
      await expect(adjustUserCredits(store, gameState, 'ghost', { amount: 5, reason: 'x' }, admin))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('listAudit', () => {
    test('lists the events by target, a page at a time, with the total', async () => {
      await adjustUserCredits(store, gameState, 'p1', { amount: 10, reason: 'uno' }, admin);
      await adjustUserCredits(store, gameState, 'p2', { amount: 10, reason: 'due' }, admin);
      await adjustUserCredits(store, gameState, 'p1', { amount: 10, reason: 'tre' }, admin);

      const page = await listAudit(store, { targetId: 'p1' });

      expect(page).toMatchObject({ total: 2, page: 1, limit: 20 });
      expect(page.items.map((e) => e.details.reason)).toEqual(['tre', 'uno']);
      await expect(listAudit(store, { page: 2, limit: 3 })).resolves.toMatchObject({ total: 4, items: [expect.anything()] });
    });
  });
});
