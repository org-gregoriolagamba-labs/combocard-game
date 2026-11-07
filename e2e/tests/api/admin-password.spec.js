/**
 * Admin area: reset of the password
 *
 * The admin resets the password of a user: the server makes a temporary one, which the admin gets once.
 * The old password and the old sessions stop working; with the temporary one the user can only choose a
 * new password, then they are in. The audit log never holds a password. Needs a server on PostgreSQL
 * (E2E_DATABASE_URL): with the in-memory server nobody can be made admin.
 * @tags @api @admin
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import { PASSWORD, registerPlayer } from '../helpers/auth.js';
import { E2E_DATABASE_URL, registerAdmin } from '../helpers/admin.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.skip(!E2E_DATABASE_URL, 'needs a server on PostgreSQL: set E2E_DATABASE_URL');

const login = (request, player, password) => request.post(`${API_URL}/api/auth/login`, { data: { username: player.name, password } });
const me = (request, player, headers = player.headers) => request.get(`${API_URL}/api/players/${player.id}`, { headers });

test.describe('Admin area: password reset @admin', () => {
  test('a player gets 403 on the reset route', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Giocatore');

    const response = await request.post(`${API_URL}/api/admin/users/${player.id}/password/reset`, { headers: player.headers, data: { reason: 'x' } });

    expect(response.status()).toBe(403);
  });

  test('the temporary password is shown once, opens only the change of the password, and then the user is in', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const context = await playwrightRequest.newContext();
    const player = await registerPlayer(context, API_URL, 'Dimentica');
    const reset = (data) => request.post(`${API_URL}/api/admin/users/${player.id}/password/reset`, { headers: admin.headers, data });

    expect((await reset({})).status()).toBe(400);
    const response = await reset({ reason: 'dimenticata' });
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    const { user, temporaryPassword } = (await response.json()).data;
    expect(user).toMatchObject({ playerId: player.id });
    expect(temporaryPassword).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){2}$/);

    // The old password and the old session are over
    expect((await login(context, player, PASSWORD)).status()).toBe(401);
    expect((await me(context, player)).status()).toBe(401);
    expect((await context.post(`${API_URL}/api/auth/refresh`)).status()).toBe(401);

    // The temporary one logs in, and nothing else
    const session = await login(context, player, temporaryPassword);
    expect(session.status()).toBe(200);
    const { accessToken, mustChangePassword } = (await session.json()).data;
    expect(mustChangePassword).toBe(true);
    const restricted = { Authorization: `Bearer ${accessToken}` };
    const blocked = await me(context, player, restricted);
    expect(blocked.status()).toBe(403);
    expect((await blocked.json()).message).toBe('You must change your password first');
    expect((await context.get(`${API_URL}/api/games`, { headers: restricted })).status()).toBe(403);

    // The change: a wrong current password, the same one, and then the right way
    const change = (data) => context.post(`${API_URL}/api/auth/password`, { headers: restricted, data });
    expect((await change({ currentPassword: 'sbagliata', newPassword: 'una password mia' })).status()).toBe(400);
    expect((await change({ currentPassword: temporaryPassword, newPassword: temporaryPassword })).status()).toBe(400);
    expect((await change({ currentPassword: temporaryPassword, newPassword: 'corta' })).status()).toBe(400);
    const changed = await change({ currentPassword: temporaryPassword, newPassword: 'una password mia' });
    expect(changed.status()).toBe(200);
    const fresh = (await changed.json()).data;
    expect(fresh.mustChangePassword).toBe(false);
    const free = { Authorization: `Bearer ${fresh.accessToken}` };
    expect((await me(context, player, free)).status()).toBe(200);
    expect((await me(context, player, restricted)).status()).toBe(401);

    expect((await login(context, player, temporaryPassword)).status()).toBe(401);
    const again = await login(context, player, 'una password mia');
    expect(again.status()).toBe(200);
    expect((await again.json()).data.mustChangePassword).toBe(false);

    const audit = await request.get(`${API_URL}/api/admin/audit?targetId=${player.id}`, { headers: admin.headers });
    const text = JSON.stringify((await audit.json()).data.items);
    expect(text).toContain('password_reset');
    expect(text).toContain('password_changed');
    expect(text).not.toContain(temporaryPassword);
    expect(text).not.toContain('una password mia');
    await context.dispose();
  });

  test('an admin cannot reset their own password, and an unknown user is a 404', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);

    const self = await request.post(`${API_URL}/api/admin/users/${admin.id}/password/reset`, { headers: admin.headers, data: { reason: 'x' } });
    const ghost = await request.post(`${API_URL}/api/admin/users/ghost/password/reset`, { headers: admin.headers, data: { reason: 'x' } });

    expect(self.status()).toBe(409);
    expect(ghost.status()).toBe(404);
  });

  test('the change of the password asks for a login', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/auth/password`, { data: { currentPassword: 'x', newPassword: 'una password mia' } });

    expect(response.status()).toBe(401);
  });
});
