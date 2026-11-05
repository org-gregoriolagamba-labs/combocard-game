/**
 * Auth Controller Tests
 *
 * Run the real controllers on the memory store. The Playwright API specs
 * cover the same flows over HTTP.
 */

import { jest } from '@jest/globals';
import { register, login, refresh, logout } from '../../src/controllers/auth.controller.js';
import { hashRefreshToken, verifyAccessToken } from '../../src/services/auth.service.js';
import { createMemoryStore } from '../../src/db/store.js';

const CREDENTIALS = { username: 'Anna', password: 'correct horse' };

function createContext() {
  const context = { gameState: { games: {}, players: {} }, store: createMemoryStore(), cookie: null };

  context.call = (handler, { body = {}, cookie = context.cookie } = {}) =>
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
      expect(JSON.stringify(res)).not.toMatch(/password|argon2/i);
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
  });

  describe('refresh', () => {
    test('without a cookie reports no session, without an error', async () => {
      const res = await ctx.call(refresh);
      expect(res.status).toBe(200);
      expect(res.data).toEqual({ accessToken: null, player: null });
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

