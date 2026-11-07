/**
 * Deletion of one's own account
 *
 * A player deletes their own account with the password: they cannot log in or use the token any more, the
 * name is free, the refresh cookie is gone. Not while in a game. Works on the in-memory server too (the
 * test of the admin needs a database, so it is skipped without E2E_DATABASE_URL).
 * @tags @api
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import { PASSWORD, registerPlayer } from '../helpers/auth.js';
import { E2E_DATABASE_URL, promoteToAdmin } from '../helpers/admin.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

const remove = (request, player, data) =>
  request.delete(`${API_URL}/api/auth/account`, { headers: player.headers, data });

test.describe('Deletion of one\'s own account', () => {
  test('needs the login and the password', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Giocatore');

    expect((await request.delete(`${API_URL}/api/auth/account`, { data: { password: PASSWORD } })).status()).toBe(401);
    expect((await remove(request, player, {})).status()).toBe(400);
    const wrong = await remove(request, player, { password: 'sbagliata' });
    expect(wrong.status()).toBe(400);
    expect((await wrong.json()).message).toBe('Current password is incorrect');
    expect((await request.get(`${API_URL}/api/players/${player.id}`, { headers: player.headers })).status()).toBe(200);
  });

  test('with the password the account is gone: no login, no token, no refresh, and the name is free', async () => {
    const context = await playwrightRequest.newContext();
    const player = await registerPlayer(context, API_URL, 'Eliminato');
    await context.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 200 } });

    const response = await remove(context, player, { password: PASSWORD });

    expect(response.status()).toBe(200);
    expect((await response.json()).data).toEqual({ playerId: player.id, credits: 200 });
    expect((await context.post(`${API_URL}/api/auth/login`, { data: { username: player.name, password: PASSWORD } })).status()).toBe(401);
    expect((await context.get(`${API_URL}/api/players/${player.id}`, { headers: player.headers })).status()).toBe(401);
    expect((await context.post(`${API_URL}/api/auth/refresh`)).status()).toBe(200);
    const again = await context.post(`${API_URL}/api/auth/register`, { data: { username: player.name, password: PASSWORD } });
    expect(again.status()).toBe(201);
    await context.dispose();
  });

  test('a player who is in a game cannot, and can when they have left', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Giocatore');
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 500 } });
    const created = await request.post(`${API_URL}/api/games`, { headers: player.headers, data: { requiredCredits: 100, maxPlayers: 4 } });
    const { gameId } = (await created.json()).data;
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers });

    const refused = await remove(request, player, { password: PASSWORD });

    expect(refused.status()).toBe(409);
    expect((await refused.json()).message).toBe('You cannot delete your account while you are in a game');
    await request.post(`${API_URL}/api/games/${gameId}/leave`, { headers: player.headers });
    expect((await remove(request, player, { password: PASSWORD })).status()).toBe(200);
  });

  test('an admin who is not the last active one can delete themselves', async ({ request }) => {
    test.skip(!E2E_DATABASE_URL, 'needs a server on PostgreSQL: set E2E_DATABASE_URL');
    // The refusal for the last active admin is tested by the unit tests and on PostgreSQL: on a database shared
    // by many tests the number of admins is not certain, so here there are surely two
    const admin = await registerPlayer(request, API_URL, 'Admin');
    const other = await registerPlayer(request, API_URL, 'Altro');
    promoteToAdmin(admin.name);
    promoteToAdmin(other.name);

    const response = await remove(request, admin, { password: PASSWORD });

    expect(response.status()).toBe(200);
  });
});
