/**
 * Authentication API Tests
 *
 * @tags @api @auth @critical
 */

import { test, expect } from '@playwright/test';
import { PASSWORD, registerPlayer, uniqueUsername } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

const cookieFrom = (response) => response.headers()['set-cookie']?.split(';')[0];

test.describe('Registration and login @critical', () => {
  test('should register and return a working token, without the password', async ({ request }) => {
    const username = uniqueUsername('Anna');

    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: { username, password: PASSWORD },
    });

    expect(response.status()).toBe(201);
    const text = await response.text();
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toMatch(/argon2|passwordHash/);

    const { accessToken, player } = JSON.parse(text).data;
    expect(player.name).toBe(username);
    expect(player.credits).toBe(0);

    const me = await request.get(`${API_URL}/api/players/${player.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(me.ok()).toBe(true);
  });

  test('should set the refresh cookie as HttpOnly, only for the auth routes', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: { username: uniqueUsername(), password: PASSWORD },
    });

    const cookie = response.headers()['set-cookie'];
    expect(cookie).toContain('combocard_refresh=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/auth');
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  test('should refuse a username already taken, whatever the case (#35)', async ({ request }) => {
    const username = uniqueUsername('Anna');
    await request.post(`${API_URL}/api/auth/register`, { data: { username, password: PASSWORD } });

    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: { username: username.toUpperCase(), password: 'another-password' },
    });

    expect(response.status()).toBe(409);
  });

  test('should bring back the same player and credits with the login (#35)', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Returning');
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, {
      headers: player.headers,
      data: { amount: 500 },
    });

    const response = await request.post(`${API_URL}/api/auth/login`, {
      data: { username: player.name, password: PASSWORD },
    });

    expect(response.ok()).toBe(true);
    const logged = (await response.json()).data.player;
    expect(logged.id).toBe(player.id);
    expect(logged.credits).toBe(500);
  });

  test('should give the same error for a wrong password and an unknown user', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Wrong');

    const wrongPassword = await request.post(`${API_URL}/api/auth/login`, {
      data: { username: player.name, password: 'not-the-password' },
    });
    const unknownUser = await request.post(`${API_URL}/api/auth/login`, {
      data: { username: uniqueUsername('Nobody'), password: PASSWORD },
    });

    expect(wrongPassword.status()).toBe(401);
    expect(unknownUser.status()).toBe(401);
    expect((await wrongPassword.json()).message).toBe((await unknownUser.json()).message);
  });

  for (const [name, data] of [
    ['missing fields', {}],
    ['a short password', { username: 'ValidName', password: 'short' }],
    ['a short username', { username: 'ab', password: PASSWORD }],
    ['a username with forbidden characters', { username: '<script>', password: PASSWORD }],
  ]) {
    test(`should reject a registration with ${name}`, async ({ request }) => {
      const response = await request.post(`${API_URL}/api/auth/register`, { data });
      expect(response.status()).toBe(400);
    });
  }

  test('should no longer offer the old registration and the list of players', async ({ request }) => {
    const oldRegister = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: 'Old' },
    });
    expect(oldRegister.ok()).toBe(false);

    const list = await request.get(`${API_URL}/api/players`);
    expect(list.status()).toBe(404);
  });
});

test.describe('Protected routes @critical', () => {
  for (const [method, path] of [
    ['get', '/api/games/lobby'],
    ['post', '/api/games'],
    ['get', '/api/games/any'],
    ['post', '/api/games/any/join'],
    ['post', '/api/games/any/start'],
    ['post', '/api/games/any/draw'],
    ['post', '/api/games/any/claim'],
    ['post', '/api/games/any/jolly'],
    ['post', '/api/games/any/leave'],
    ['get', '/api/players/any'],
    ['post', '/api/players/any/buy-credits'],
    ['get', '/api/game/lobby'],
  ]) {
    test(`${method.toUpperCase()} ${path} should require a token`, async ({ request }) => {
      expect((await request[method](`${API_URL}${path}`)).status()).toBe(401);

      const withBadToken = await request[method](`${API_URL}${path}`, {
        headers: { Authorization: 'Bearer not-a-token' },
      });
      expect(withBadToken.status()).toBe(401);
    });
  }

  test('should not let a player read or spend for another player', async ({ request }) => {
    const anna = await registerPlayer(request, API_URL, 'Anna');
    const carlo = await registerPlayer(request, API_URL, 'Carlo');

    const read = await request.get(`${API_URL}/api/players/${anna.id}`, { headers: carlo.headers });
    expect(read.status()).toBe(403);

    const buy = await request.post(`${API_URL}/api/players/${anna.id}/buy-credits`, {
      headers: carlo.headers,
      data: { amount: 100 },
    });
    expect(buy.status()).toBe(403);
  });

  test('should act as the token owner, whatever the body says', async ({ request }) => {
    const anna = await registerPlayer(request, API_URL, 'Anna');
    const carlo = await registerPlayer(request, API_URL, 'Carlo');
    for (const player of [anna, carlo]) {
      await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, {
        headers: player.headers,
        data: { amount: 1000 },
      });
    }
    const created = await request.post(`${API_URL}/api/games`, {
      headers: anna.headers,
      data: { requiredCredits: 100, maxPlayers: 4 },
    });
    const { gameId } = (await created.json()).data;

    await request.post(`${API_URL}/api/games/${gameId}/join`, {
      headers: carlo.headers,
      data: { playerId: anna.id },
    });

    const game = (await (await request.get(`${API_URL}/api/games/${gameId}`, { headers: anna.headers })).json()).data;
    expect(game.players.map((p) => p.id)).toEqual([carlo.id]);
  });

  test('should let only the creator start the game and draw cards', async ({ request }) => {
    const anna = await registerPlayer(request, API_URL, 'Anna');
    const carlo = await registerPlayer(request, API_URL, 'Carlo');
    for (const player of [anna, carlo]) {
      await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, {
        headers: player.headers,
        data: { amount: 1000 },
      });
    }
    const created = await request.post(`${API_URL}/api/games`, {
      headers: anna.headers,
      data: { requiredCredits: 100, maxPlayers: 4 },
    });
    const { gameId } = (await created.json()).data;
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: anna.headers });
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: carlo.headers });

    const startByOther = await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: carlo.headers });
    expect(startByOther.status()).toBe(403);

    const start = await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: anna.headers });
    expect(start.ok()).toBe(true);

    const drawByOther = await request.post(`${API_URL}/api/games/${gameId}/draw`, { headers: carlo.headers });
    expect(drawByOther.status()).toBe(403);

    const draw = await request.post(`${API_URL}/api/games/${gameId}/draw`, { headers: anna.headers });
    expect(draw.ok()).toBe(true);

    const startAgain = await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: anna.headers });
    expect(startAgain.status()).toBe(400);
  });

  test('should hide a game from players who are not part of it', async ({ request }) => {
    const anna = await registerPlayer(request, API_URL, 'Anna');
    const carlo = await registerPlayer(request, API_URL, 'Carlo');
    await request.post(`${API_URL}/api/players/${anna.id}/buy-credits`, {
      headers: anna.headers,
      data: { amount: 1000 },
    });
    const created = await request.post(`${API_URL}/api/games`, {
      headers: anna.headers,
      data: { requiredCredits: 100, maxPlayers: 4 },
    });
    const { gameId } = (await created.json()).data;

    const response = await request.get(`${API_URL}/api/games/${gameId}`, { headers: carlo.headers });

    expect(response.status()).toBe(403);
  });
});

test.describe('Session renewal and logout @critical', () => {
  // Each call sends only the cookie given here, without the shared cookie jar
  const refresh = (playwright, cookie) =>
    playwright.request.newContext().then(async (context) => {
      const response = await context.post(`${API_URL}/api/auth/refresh`, {
        headers: cookie ? { Cookie: cookie } : {},
      });
      const result = { status: response.status(), body: await response.json(), cookie: cookieFrom(response) };
      await context.dispose();
      return result;
    });

  const signUp = async (request) => {
    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: { username: uniqueUsername('Session'), password: PASSWORD },
    });
    return { cookie: cookieFrom(response), player: (await response.json()).data.player };
  };

  test('should report no session without a cookie, without an error', async ({ playwright }) => {
    const { status, body } = await refresh(playwright);

    expect(status).toBe(200);
    expect(body.data).toEqual({ accessToken: null, player: null });
  });

  test('should give a new working token and replace the cookie', async ({ request, playwright }) => {
    const { cookie, player } = await signUp(request);

    const renewed = await refresh(playwright, cookie);

    expect(renewed.status).toBe(200);
    expect(renewed.body.data.player.id).toBe(player.id);
    expect(renewed.cookie).not.toBe(cookie);

    const me = await request.get(`${API_URL}/api/players/${player.id}`, {
      headers: { Authorization: `Bearer ${renewed.body.data.accessToken}` },
    });
    expect(me.ok()).toBe(true);
  });

  test('should refuse a made-up cookie', async ({ playwright }) => {
    const { status } = await refresh(playwright, 'combocard_refresh=made-up');
    expect(status).toBe(401);
  });

  test('should end the session with the logout', async ({ request, playwright }) => {
    const { cookie } = await signUp(request);

    const context = await playwright.request.newContext();
    const logout = await context.post(`${API_URL}/api/auth/logout`, { headers: { Cookie: cookie } });
    await context.dispose();

    expect(logout.ok()).toBe(true);
    expect((await refresh(playwright, cookie)).status).toBe(401);
  });

  test('should accept a logout without a session', async ({ playwright }) => {
    const context = await playwright.request.newContext();
    const logout = await context.post(`${API_URL}/api/auth/logout`);
    await context.dispose();

    expect(logout.ok()).toBe(true);
  });
});
