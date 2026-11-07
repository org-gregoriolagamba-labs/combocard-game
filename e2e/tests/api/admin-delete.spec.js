/**
 * Admin area: deletion of an account
 *
 * The admin deletes an account: it cannot log in any more, the name is free, the audit log does not hold
 * the username. Not the last admin, not a player who is in a game, not oneself. Needs a server on PostgreSQL
 * (E2E_DATABASE_URL): with the in-memory server nobody can be made admin.
 * @tags @api @admin
 */

import { test, expect } from '@playwright/test';
import { PASSWORD, registerPlayer } from '../helpers/auth.js';
import { E2E_DATABASE_URL, registerAdmin } from '../helpers/admin.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.skip(!E2E_DATABASE_URL, 'needs a server on PostgreSQL: set E2E_DATABASE_URL');

const remove = (request, admin, player, data) =>
  request.delete(`${API_URL}/api/admin/users/${player.id}`, { headers: admin.headers, data });

test.describe('Admin area: deletion of an account @admin', () => {
  test('a player gets 403', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Giocatore');
    const other = await registerPlayer(request, API_URL, 'Altro');

    const response = await remove(request, player, other, { reason: 'x' });

    expect(response.status()).toBe(403);
  });

  test('a deleted account cannot log in or use its token, the name is free, the audit log has no username', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Eliminato');
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 200 } });

    expect((await remove(request, admin, player, {})).status()).toBe(400);
    const response = await remove(request, admin, player, { reason: 'richiesta di cancellazione' });

    expect(response.status()).toBe(200);
    expect((await response.json()).data).toEqual({ playerId: player.id, credits: 200 });
    expect((await request.post(`${API_URL}/api/auth/login`, { data: { username: player.name, password: PASSWORD } })).status()).toBe(401);
    expect((await request.get(`${API_URL}/api/players/${player.id}`, { headers: player.headers })).status()).toBe(401);
    const found = await request.get(`${API_URL}/api/admin/users?q=${encodeURIComponent(player.name.toLowerCase())}`, { headers: admin.headers });
    expect((await found.json()).data.total).toBe(0);

    const audit = await request.get(`${API_URL}/api/admin/audit?targetId=${player.id}`, { headers: admin.headers });
    const [event] = (await audit.json()).data.items;
    expect(event).toMatchObject({ action: 'user_deleted', actorId: admin.id, details: { role: 'player', reason: 'richiesta di cancellazione', self: false } });
    expect(JSON.stringify(event)).not.toContain(player.name);

    const again = await request.post(`${API_URL}/api/auth/register`, { data: { username: player.name, password: PASSWORD } });
    expect(again.status()).toBe(201);
  });

  test('a player who is in a game is a 409 and stays, and can be deleted when the game is over', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Giocatore');
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 500 } });
    const created = await request.post(`${API_URL}/api/games`, { headers: player.headers, data: { requiredCredits: 100, maxPlayers: 4 } });
    const { gameId } = (await created.json()).data;
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers });

    const refused = await remove(request, admin, player, { reason: 'x' });

    expect(refused.status()).toBe(409);
    expect((await request.get(`${API_URL}/api/players/${player.id}`, { headers: player.headers })).status()).toBe(200);

    await request.post(`${API_URL}/api/games/${gameId}/leave`, { headers: player.headers });
    expect((await remove(request, admin, player, { reason: 'x' })).status()).toBe(200);
  });

  test('an admin cannot delete themselves from here, and an unknown user is a 404', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);

    expect((await remove(request, admin, admin, { reason: 'x' })).status()).toBe(409);
    expect((await remove(request, admin, { id: 'ghost' }, { reason: 'x' })).status()).toBe(404);
    expect((await request.get(`${API_URL}/api/players/${admin.id}`, { headers: admin.headers })).status()).toBe(200);
  });
});
