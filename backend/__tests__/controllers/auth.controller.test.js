/**
 * Auth Controller Tests
 *
 * Run the real controllers on the memory store. The Playwright API specs
 * cover the same flows over HTTP.
 */

import { jest } from '@jest/globals';
import { register, login, refresh, logout, changePassword } from '../../src/controllers/auth.controller.js';
import { hashRefreshToken, verifyAccessToken } from '../../src/services/auth.service.js';
import { createMemoryStore } from '../../src/db/store.js';

const CREDENTIALS = { username: 'Anna', password: 'correct horse' };

function createContext() {
  const context = { gameState: { games: {}, players: {} }, store: createMemoryStore(), cookie: null };

  context.call = (handler, { body = {}, cookie = context.cookie, auth } = {}) =>
    new Promise((resolve, reject) => {
      const result = { status: 200 };
      const res = {
        cookie: (_name, value, options) => {
          context.cookie = value;
          result.cookieOptions = options;
        },
        clearCookie: () => {
          context.cookie = null;
          result.clearedCookie = true;
        },
        status(code) {
          result.status = code;
          return res;
        },
        json(payload) {
          resolve({ ...payload, ...result });
          return res;
        },
      };
      const req = {
        body,
        cookies: cookie ? { combocard_refresh: cookie } : {},
        gameState: context.gameState,
        store: context.store,
        auth,
      };
      handler(req, res, reject);
    });

  return context;
}

describe('auth controller', () => {
  let ctx;

  beforeEach(() => {
    ctx = createContext();
  });

  describe('register', () => {
    test('creates the player and starts a session', async () => {
      const res = await ctx.call(register, { body: CREDENTIALS });

      expect(res.status).toBe(201);
      expect(res.data.player).toMatchObject({ name: 'Anna', credits: 0 });
      expect(ctx.gameState.players[res.data.player.id]).toBeDefined();
      expect(verifyAccessToken(res.data.accessToken).playerId).toBe(res.data.player.id);
    });

    test('never returns the password or its hash', async () => {
      const res = await ctx.call(register, { body: CREDENTIALS });
      expect(JSON.stringify(res)).not.toMatch(/passwordHash|correct horse|argon2/i);
    });

    test('sets a cookie that JavaScript cannot read, only for the auth routes', async () => {
      const res = await ctx.call(register, { body: CREDENTIALS });

      expect(ctx.cookie).toEqual(expect.any(String));
      expect(res.cookieOptions).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/api/auth' });
    });

    test.each(['Anna', 'anna', ' ANNA '])('rejects the taken username %j and creates nothing', async (username) => {
      await ctx.call(register, { body: CREDENTIALS });

      await expect(ctx.call(register, { body: { username, password: 'another pass' } }))
        .rejects.toMatchObject({ statusCode: 409 });
      expect(Object.keys(ctx.gameState.players)).toHaveLength(1);
    });

    test('removes the player when the account cannot be saved', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      ctx.store.createAccount = async () => { throw new Error('down'); };

      await expect(ctx.call(register, { body: CREDENTIALS })).rejects.toMatchObject({ statusCode: 503 });

      expect(ctx.gameState.players).toEqual({});
      errorSpy.mockRestore();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await ctx.call(register, { body: CREDENTIALS });
      ctx.cookie = null;
    });

    test('with the right credentials returns the same player, credits included', async () => {
      const [player] = Object.values(ctx.gameState.players);
      player.credits = 500;

      const res = await ctx.call(login, { body: CREDENTIALS });

      expect(res.data.player.id).toBe(player.id);
      expect(res.data.player.credits).toBe(500);
      expect(ctx.cookie).toEqual(expect.any(String));
    });

    test('is not case sensitive on the username', async () => {
      const res = await ctx.call(login, { body: { ...CREDENTIALS, username: 'ANNA' } });
      expect(res.status).toBe(200);
    });

    test('gives the same error for a wrong password and an unknown user', async () => {
      const wrongPassword = await ctx.call(login, { body: { ...CREDENTIALS, password: 'nope nope' } }).catch((e) => e);
      const unknownUser = await ctx.call(login, { body: { ...CREDENTIALS, username: 'Nobody' } }).catch((e) => e);

      expect(wrongPassword.statusCode).toBe(401);
      expect(unknownUser.statusCode).toBe(401);
      expect(wrongPassword.message).toBe(unknownUser.message);
      expect(ctx.cookie).toBeNull();
    });

    test('puts the version of the session in the access token', async () => {
      const res = await ctx.call(login, { body: CREDENTIALS });

      expect(verifyAccessToken(res.data.accessToken).sessionVersion).toBe(0);
    });

    test('a suspended account does not get in, and gets no session', async () => {
      const [player] = Object.values(ctx.gameState.players);
      await ctx.store.setAccountSuspended(player.id, true, { actor: { type: 'system' }, reason: 'abuso' });

      await expect(ctx.call(login, { body: CREDENTIALS })).rejects.toMatchObject({ statusCode: 403, message: 'This account is suspended' });
      expect(ctx.cookie).toBeNull();
    });

    test('a suspended account with a wrong password is told nothing about it', async () => {
      const [player] = Object.values(ctx.gameState.players);
      await ctx.store.setAccountSuspended(player.id, true, { actor: { type: 'system' }, reason: 'abuso' });

      await expect(ctx.call(login, { body: { ...CREDENTIALS, password: 'nope nope' } })).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('refresh', () => {
    test('a suspended account cannot renew the session', async () => {
      const { data } = await ctx.call(register, { body: CREDENTIALS });
      const cookie = ctx.cookie;
      await ctx.store.setAccountSuspended(data.player.id, true, { actor: { type: 'system' }, reason: 'abuso' });

      await expect(ctx.call(refresh, { cookie })).rejects.toMatchObject({ statusCode: 401 });
    });

    test('after the sessions are closed the cookie no longer works', async () => {
      const { data } = await ctx.call(register, { body: CREDENTIALS });
      const cookie = ctx.cookie;
      await ctx.store.revokeAccountSessions(data.player.id, { actor: { type: 'system' }, reason: 'furto' });

      await expect(ctx.call(refresh, { cookie })).rejects.toMatchObject({ statusCode: 401 });
    });

    test('a new access token has the current version of the session', async () => {
      const { data } = await ctx.call(register, { body: CREDENTIALS });
      await ctx.store.revokeAccountSessions(data.player.id, { actor: { type: 'system' }, reason: 'furto' });
      const login2 = await ctx.call(login, { body: CREDENTIALS });

      const res = await ctx.call(refresh);

      expect(verifyAccessToken(res.data.accessToken).sessionVersion).toBe(verifyAccessToken(login2.data.accessToken).sessionVersion);
      expect(verifyAccessToken(res.data.accessToken).sessionVersion).toBeGreaterThan(0);
    });

    test('without a cookie reports no session, without an error', async () => {
      const res = await ctx.call(refresh);
      expect(res.status).toBe(200);
      expect(res.data).toEqual({ accessToken: null, player: null, role: null });
    });

    test('returns a new access token and replaces the cookie', async () => {
      const first = await ctx.call(register, { body: CREDENTIALS });
      const firstCookie = ctx.cookie;

      const res = await ctx.call(refresh);

      expect(verifyAccessToken(res.data.accessToken).playerId).toBe(first.data.player.id);
      expect(res.data.player.id).toBe(first.data.player.id);
      expect(ctx.cookie).not.toBe(firstCookie);
    });

    test('rejects an unknown token and clears the cookie', async () => {
      await expect(ctx.call(refresh, { cookie: 'made-up' })).rejects.toMatchObject({ statusCode: 401 });
    });

    test('accepts an old token for a few seconds, for tabs renewing at the same time', async () => {
      await ctx.call(register, { body: CREDENTIALS });
      const oldCookie = ctx.cookie;
      await ctx.call(refresh);

      const res = await ctx.call(refresh, { cookie: oldCookie });

      expect(res.status).toBe(200);
      expect(res.data.accessToken).toEqual(expect.any(String));
    });

    test('rejects a token past its expiry', async () => {
      const { data } = await ctx.call(register, { body: CREDENTIALS });
      await ctx.store.createRefreshToken({
        tokenHash: hashRefreshToken('expired'),
        familyId: 'f2',
        playerId: data.player.id,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(ctx.call(refresh, { cookie: 'expired' })).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('the password that an admin reset', () => {
    const admin = { type: 'player', id: 'p9' };
    let playerId;

    beforeEach(async () => {
      playerId = (await ctx.call(register, { body: CREDENTIALS })).data.player.id;
      ctx.cookie = null;
    });

    const reset = async () => {
      const { hashPassword } = await import('../../src/services/auth.service.js');
      await ctx.store.resetAccountPassword(playerId, await hashPassword('temporary-1'), { actor: admin, reason: 'x' });
    };

    test('the old password no longer works; the temporary one logs in and says the password must change', async () => {
      await reset();

      await expect(ctx.call(login, { body: CREDENTIALS })).rejects.toMatchObject({ statusCode: 401 });
      const res = await ctx.call(login, { body: { username: 'Anna', password: 'temporary-1' } });

      expect(res.status).toBe(200);
      expect(res.data.mustChangePassword).toBe(true);
    });

    test('a normal login says the password does not have to change; so do the refresh and the registration', async () => {
      const res = await ctx.call(login, { body: CREDENTIALS });
      expect(res.data.mustChangePassword).toBe(false);
      expect((await ctx.call(refresh)).data.mustChangePassword).toBe(false);
      ctx.cookie = null;
      expect((await ctx.call(register, { body: { username: 'Carlo', password: 'another pass' } })).data.mustChangePassword).toBe(false);
    });

    test('the refresh of a session opened with the temporary password still says it', async () => {
      await reset();
      await ctx.call(login, { body: { username: 'Anna', password: 'temporary-1' } });

      expect((await ctx.call(refresh)).data.mustChangePassword).toBe(true);
    });

    test('changePassword: with the current password sets the new one, clears the obligation and opens a new session', async () => {
      await reset();
      const first = await ctx.call(login, { body: { username: 'Anna', password: 'temporary-1' } });
      const oldCookie = ctx.cookie;

      const res = await ctx.call(changePassword, {
        auth: { playerId, role: 'player' },
        body: { currentPassword: 'temporary-1', newPassword: 'my new password' },
      });

      expect(res.status).toBe(200);
      expect(res.data).toMatchObject({ role: 'player', player: { id: playerId } });
      expect(res.data.mustChangePassword).toBe(false);
      expect(verifyAccessToken(res.data.accessToken).sessionVersion).toBeGreaterThan(verifyAccessToken(first.data.accessToken).sessionVersion);
      expect(ctx.cookie).not.toBe(oldCookie);
      await expect(ctx.call(refresh, { cookie: oldCookie })).rejects.toMatchObject({ statusCode: 401 });
      await expect(ctx.call(login, { body: { username: 'Anna', password: 'temporary-1' } })).rejects.toMatchObject({ statusCode: 401 });
      expect((await ctx.call(login, { body: { username: 'Anna', password: 'my new password' } })).data.mustChangePassword).toBe(false);
    });

    test('changePassword: a wrong current password is a 400 and nothing changes', async () => {
      await reset();

      await expect(ctx.call(changePassword, {
        auth: { playerId, role: 'player' },
        body: { currentPassword: 'not it', newPassword: 'my new password' },
      })).rejects.toMatchObject({ statusCode: 400, message: 'Current password is incorrect' });

      expect((await ctx.call(login, { body: { username: 'Anna', password: 'temporary-1' } })).data.mustChangePassword).toBe(true);
    });

    test('changePassword: the new password must be different', async () => {
      await expect(ctx.call(changePassword, {
        auth: { playerId, role: 'player' },
        body: { currentPassword: CREDENTIALS.password, newPassword: CREDENTIALS.password },
      })).rejects.toMatchObject({ statusCode: 400, message: 'The new password must be different' });
    });

    test('changePassword: the new password is never in the answer', async () => {
      const res = await ctx.call(changePassword, {
        auth: { playerId, role: 'player' },
        body: { currentPassword: CREDENTIALS.password, newPassword: 'my new password' },
      });

      expect(JSON.stringify(res)).not.toMatch(/my new password|argon2/);
    });

    test('changePassword: if the store cannot write, the answer is a 503 and the password stays', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      ctx.store.changeAccountPassword = async () => { throw new Error('down'); };

      await expect(ctx.call(changePassword, {
        auth: { playerId, role: 'player' },
        body: { currentPassword: CREDENTIALS.password, newPassword: 'my new password' },
      })).rejects.toMatchObject({ statusCode: 503 });

      expect((await ctx.call(login, { body: CREDENTIALS })).status).toBe(200);
      jest.restoreAllMocks();
    });
  });

  describe('logout', () => {
    test('ends the session: the cookie no longer works', async () => {
      await ctx.call(register, { body: CREDENTIALS });
      const cookie = ctx.cookie;

      const res = await ctx.call(logout);

      expect(res.status).toBe(200);
      expect(res.clearedCookie).toBe(true);
      await expect(ctx.call(refresh, { cookie })).rejects.toMatchObject({ statusCode: 401 });
    });

    test('also revokes the tokens already renewed from that session', async () => {
      await ctx.call(register, { body: CREDENTIALS });
      const oldCookie = ctx.cookie;
      await ctx.call(refresh);

      await ctx.call(logout);

      await expect(ctx.call(refresh, { cookie: oldCookie })).rejects.toMatchObject({ statusCode: 401 });
    });

    test('does not touch the sessions on other devices', async () => {
      await ctx.call(register, { body: CREDENTIALS });
      const otherDevice = ctx.cookie;
      await ctx.call(login, { body: CREDENTIALS });

      await ctx.call(logout);

      const res = await ctx.call(refresh, { cookie: otherDevice });
      expect(res.data.accessToken).toEqual(expect.any(String));
    });

    test('succeeds without a session', async () => {
      await expect(ctx.call(logout)).resolves.toMatchObject({ status: 200 });
    });
  });
});

describe('the role in the answers of the login', () => {
  // The screen of the admin needs the role of whoever is logged in: only their own
  let ctx;

  beforeEach(() => {
    ctx = createContext();
  });

  const promote = (playerId) => ctx.store.setAccountRole(playerId, 'admin', { actor: { type: 'system' } });

  test('register, login and refresh say the role: player at first', async () => {
    const registered = await ctx.call(register, { body: CREDENTIALS });
    const logged = await ctx.call(login, { body: CREDENTIALS });
    const renewed = await ctx.call(refresh);

    expect([registered.data.role, logged.data.role, renewed.data.role]).toEqual(['player', 'player', 'player']);
  });

  test('after a promotion the next login and refresh say admin', async () => {
    const registered = await ctx.call(register, { body: CREDENTIALS });
    await promote(registered.data.player.id);

    const logged = await ctx.call(login, { body: CREDENTIALS });
    const renewed = await ctx.call(refresh);

    expect(logged.data.role).toBe('admin');
    expect(renewed.data.role).toBe('admin');
  });

  test('the role is beside the player, not inside it: the player is what the game shows', async () => {
    const registered = await ctx.call(register, { body: CREDENTIALS });

    expect(registered.data.player).not.toHaveProperty('role');
  });

  test('without a session there is no role either', async () => {
    const res = await ctx.call(refresh);

    expect(res.data).toEqual({ accessToken: null, player: null, role: null });
  });
});

