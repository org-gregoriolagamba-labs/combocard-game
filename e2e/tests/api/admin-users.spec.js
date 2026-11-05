/**
 * Admin area: users, credits, audit log
 *
 * The admin sees the registered users, renames them, corrects their credits with a reason, and
 * everything is written in the audit log. Needs a server on PostgreSQL (E2E_DATABASE_URL): with
 * the in-memory server nobody can be made admin.
 * @tags @api @admin
 */

import { test, expect } from '@playwright/test';
import { PASSWORD, registerPlayer } from '../helpers/auth.js';
import { E2E_DATABASE_URL, registerAdmin } from '../helpers/admin.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.skip(!E2E_DATABASE_URL, 'needs a server on PostgreSQL: set E2E_DATABASE_URL');

const credits = async (request, player) =>
  (await (await request.get(`${API_URL}/api/players/${player.id}`, { headers: player.headers })).json()).data.credits;

test.describe('Admin area: users @admin', () => {
  test('a player gets 403 on every admin route', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Giocatore');
    const routes = [
      ['get', '/api/admin/users'],
      ['get', `/api/admin/users/${player.id}`],
      ['patch', `/api/admin/users/${player.id}`],
      ['post', `/api/admin/users/${player.id}/credits`],
      ['get', '/api/admin/audit'],
    ];

    for (const [method, url] of routes) {
      const response = await request[method](`${API_URL}${url}`, { headers: player.headers, data: { role: 'admin' } });
      expect(response.status(), `${method} ${url}`).toBe(403);
    }
  });

  test('the admin finds a user by name, and the answer has no password hash', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Cercato');

    const response = await request.get(`${API_URL}/api/admin/users?q=${encodeURIComponent(player.name.toLowerCase())}`, { headers: admin.headers });

    expect(response.status()).toBe(200);
    const { items, total } = (await response.json()).data;
    expect(total).toBe(1);
    expect(items[0]).toMatchObject({ playerId: player.id, username: player.name, role: 'player', inGame: false });
    expect(JSON.stringify(items)).not.toMatch(/hash|password/i);
  });

  test('a limit over 100 or a page of zero is a 400', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);

    expect((await request.get(`${API_URL}/api/admin/users?limit=500`, { headers: admin.headers })).status()).toBe(400);
    expect((await request.get(`${API_URL}/api/admin/users?page=0`, { headers: admin.headers })).status()).toBe(400);
  });

  test('the credits: a reason is needed, the player sees the new balance, too much is refused, the audit log remembers', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Ricevente');
    const adjust = (data) => request.post(`${API_URL}/api/admin/users/${player.id}/credits`, { headers: admin.headers, data });

    expect((await adjust({ amount: 100 })).status()).toBe(400);
    expect((await adjust({ amount: 0, reason: 'x' })).status()).toBe(400);
    expect((await adjust({ amount: 100, reason: 'regalo di benvenuto' })).status()).toBe(200);
    expect(await credits(request, player)).toBe(100);

    const tooMuch = await adjust({ amount: -101, reason: 'troppo' });
    expect(tooMuch.status()).toBe(409);
    expect(await credits(request, player)).toBe(100);
    expect((await adjust({ amount: -40, reason: 'correzione' })).status()).toBe(200);
    expect(await credits(request, player)).toBe(60);

    const audit = await request.get(`${API_URL}/api/admin/audit?targetId=${player.id}`, { headers: admin.headers });
    const { items, total } = (await audit.json()).data;
    expect(total).toBe(2);
    expect(items.map((e) => [e.action, e.actorId, e.details.amount, e.details.reason])).toEqual([
      ['credits_adjusted', admin.id, -40, 'correzione'],
      ['credits_adjusted', admin.id, 100, 'regalo di benvenuto'],
    ]);
  });

  test('an admin corrects their own credits', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);

    const response = await request.post(`${API_URL}/api/admin/users/${admin.id}/credits`, {
      headers: admin.headers,
      data: { amount: 250, reason: 'prove' },
    });

    expect(response.status()).toBe(200);
    expect(await credits(request, admin)).toBe(250);
  });

  test('a rename: the new name logs in, the old one does not, a name in use is a 409', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Vecchio');
    const other = await registerPlayer(request, API_URL, 'Occupato');
    const rename = (username) => request.patch(`${API_URL}/api/admin/users/${player.id}`, { headers: admin.headers, data: { username } });
    const login = (username) => request.post(`${API_URL}/api/auth/login`, { data: { username, password: PASSWORD } });
    const newName = `${player.name}_nuovo`;

    expect((await rename(other.name.toUpperCase())).status()).toBe(409);
    expect((await rename(newName)).status()).toBe(200);

    expect((await login(newName)).status()).toBe(200);
    expect((await login(player.name)).status()).toBe(401);
  });

  test('a player in a game cannot be renamed', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'InPartita');
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 200 } });
    const created = await request.post(`${API_URL}/api/games`, { headers: player.headers, data: { requiredCredits: 100, maxPlayers: 4 } });
    const { gameId } = (await created.json()).data;
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers });

    const response = await request.patch(`${API_URL}/api/admin/users/${player.id}`, {
      headers: admin.headers,
      data: { username: `${player.name}_x` },
    });

    expect(response.status()).toBe(409);
  });

  test('a role: a promoted player gets in at once, a demoted one is out at once', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Promosso');
    const status = () => request.get(`${API_URL}/api/admin/status`, { headers: player.headers });
    const setRole = (role) => request.patch(`${API_URL}/api/admin/users/${player.id}`, { headers: admin.headers, data: { role } });

    expect((await status()).status()).toBe(403);
    expect((await setRole('admin')).status()).toBe(200);
    expect((await status()).status()).toBe(200);
    expect((await setRole('player')).status()).toBe(200);
    expect((await status()).status()).toBe(403);
  });

  test('what the body says about who acts or what else to change is ignored', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Bersaglio');

    const response = await request.patch(`${API_URL}/api/admin/users/${player.id}`, {
      headers: admin.headers,
      data: { role: 'admin', credits: 99999, actor: 'someone-else' },
    });

    expect(response.status()).toBe(200);
    expect(await credits(request, player)).toBe(0);
  });
});
