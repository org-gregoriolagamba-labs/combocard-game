/**
 * Admin area: suspension and sessions
 *
 * The admin suspends a user, who loses the access at the next request even with a token that is still
 * valid, cannot log in or renew the session; reinstates them; closes the sessions of a user without
 * suspending them. Needs a server on PostgreSQL (E2E_DATABASE_URL): with the in-memory server nobody
 * can be made admin.
 * @tags @api @admin
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import { PASSWORD, registerPlayer } from '../helpers/auth.js';
import { E2E_DATABASE_URL, registerAdmin } from '../helpers/admin.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.skip(!E2E_DATABASE_URL, 'needs a server on PostgreSQL: set E2E_DATABASE_URL');

const me = (request, player) => request.get(`${API_URL}/api/players/${player.id}`, { headers: player.headers });
const login = (request, player) => request.post(`${API_URL}/api/auth/login`, { data: { username: player.name, password: PASSWORD } });

// The player has a context of their own, with their own refresh cookie
async function playerWithSession(base) {
  const context = await playwrightRequest.newContext();
  const player = await registerPlayer(context, API_URL, base);
  return { context, player };
}

test.describe('Admin area: suspension and sessions @admin', () => {
  test('a player gets 403 on the three routes', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Giocatore');

    for (const url of ['suspend', 'unsuspend', 'sessions/revoke']) {
      const response = await request.post(`${API_URL}/api/admin/users/${player.id}/${url}`, { headers: player.headers, data: { reason: 'x' } });
      expect(response.status(), url).toBe(403);
    }
  });

  test('a suspended user loses the access at once, cannot log in or renew, and comes back when reinstated', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const { context, player } = await playerWithSession('Sospeso');
    const act = (action, data) => request.post(`${API_URL}/api/admin/users/${player.id}/${action}`, { headers: admin.headers, data });
    expect((await me(context, player)).status()).toBe(200);

    expect((await act('suspend', {})).status()).toBe(400);
    const suspended = await act('suspend', { reason: 'abuso' });
    expect(suspended.status()).toBe(200);
    expect((await suspended.json()).data).toMatchObject({ playerId: player.id, suspended: true });

    expect((await me(context, player)).status()).toBe(401); // the token is still valid for 15 minutes
    const refused = await login(context, player);
    expect(refused.status()).toBe(403);
    expect((await refused.json()).message).toBe('This account is suspended');
    expect((await context.post(`${API_URL}/api/auth/refresh`)).status()).toBe(401);

    expect((await act('unsuspend', { reason: 'chiarito' })).status()).toBe(200);
    const back = await login(context, player);
    expect(back.status()).toBe(200);
    const headers = { Authorization: `Bearer ${(await back.json()).data.accessToken}` };
    expect((await context.get(`${API_URL}/api/players/${player.id}`, { headers })).status()).toBe(200);

    const audit = await request.get(`${API_URL}/api/admin/audit?targetId=${player.id}`, { headers: admin.headers });
    expect((await audit.json()).data.items.map((e) => [e.action, e.details.reason])).toEqual([
      ['user_unsuspended', 'chiarito'],
      ['user_suspended', 'abuso'],
    ]);
    await context.dispose();
  });

  test('closing the sessions makes the old tokens useless, and a new login works', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const { context, player } = await playerWithSession('Sessioni');

    const response = await request.post(`${API_URL}/api/admin/users/${player.id}/sessions/revoke`, { headers: admin.headers, data: { reason: 'furto' } });

    expect(response.status()).toBe(200);
    expect((await response.json()).data).toMatchObject({ playerId: player.id, suspended: false });
    expect((await me(context, player)).status()).toBe(401);
    expect((await context.post(`${API_URL}/api/auth/refresh`)).status()).toBe(401);
    const again = await login(context, player);
    expect(again.status()).toBe(200);
    const headers = { Authorization: `Bearer ${(await again.json()).data.accessToken}` };
    expect((await context.get(`${API_URL}/api/players/${player.id}`, { headers })).status()).toBe(200);
    await context.dispose();
  });

  test('an admin cannot suspend themselves, and an unknown user is a 404', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);

    const self = await request.post(`${API_URL}/api/admin/users/${admin.id}/suspend`, { headers: admin.headers, data: { reason: 'x' } });
    const ghost = await request.post(`${API_URL}/api/admin/users/ghost/suspend`, { headers: admin.headers, data: { reason: 'x' } });

    expect(self.status()).toBe(409);
    expect(ghost.status()).toBe(404);
    expect((await me(request, admin)).status()).toBe(200);
  });
});
